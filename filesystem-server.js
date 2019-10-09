/*jshint esversion: 8 */
var express = require('express');
var app = express();
var size = 0;
var copyName = "";
var location = "";
var isRenameChecking = false;
const path = require('path');
const bodyParser = require("body-parser");
const archiver = require('archiver');
const multer = require('multer');
const fs = require('fs');
var cors = require('cors')

const contentRootPath = process.argv[2] === '-d' ? process.argv[3] : undefined;
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(cors());


/**
 * Reads text from the file asynchronously and returns a Promise.
 */
function GetFiles(req, res) {
    return new Promise((resolve, reject) => {
        fs.readdir(contentRootPath + req.body.path, function (err, files) {
            //handling error
            if (err) {
                console.log(err);
                reject(err);

            } else
                resolve(files);
        });
    });
}
/**
 * 
 * function to check for exising folder or file
 */
function checkForDuplicates(directory, name, isFile) {
    var filenames = fs.readdirSync(directory);
    if (filenames.indexOf(name) == -1) {
        return false;
    } else {
        for (var i = 0; i < filenames.length; i++) {
            if (filenames[i] === name) {
                if (!isFile && fs.lstatSync(directory + "/" + filenames[i]).isDirectory()) {
                    return true;
                } else if (isFile && !fs.lstatSync(directory + "/" + filenames[i]).isDirectory()) {
                    return true;
                } else {
                    return false;
                }
            }
        }
    }
}
/**
 * function to rename the folder
 */
function renameFolder(req, res) {
    var oldName = req.body.data[0].name.split("/")[req.body.data[0].name.split("/").length - 1];
    var newName = req.body.newName.split("/")[req.body.newName.split("/").length - 1];
    var oldDirectoryPath = path.join(contentRootPath + req.body.data[0].filterPath, oldName);
    var newDirectoryPath = path.join(contentRootPath + req.body.data[0].filterPath, newName);
    if (checkForDuplicates(contentRootPath + req.body.data[0].filterPath, newName, req.body.data[0].isFile)) {
        var errorMsg = new Error();
        errorMsg.message = "A file or folder with the name " + req.body.name + " already exists.";
        errorMsg.code = "400";
        response = { error: errorMsg };

        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    } else {
        fs.renameSync(oldDirectoryPath, newDirectoryPath);
        (async () => {
            await FileManagerDirectoryContent(req, res, newDirectoryPath + "/").then(data => {
                response = { files: data };
                response = JSON.stringify(response);
                res.setHeader('Content-Type', 'application/json');
                res.json(response);
            });
        })();
    }
}
/**
 * function to delete the folder
 */
function deleteFolder(req, res) {
    var deleteFolderRecursive = function (path) {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function (file, index) {
                var curPath = path + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) { // recurse
                    deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    };
    var promiseList = [];
    for (var i = 0; i < req.body.data.length; i++) {
        var newDirectoryPath = path.join(contentRootPath + req.body.data[i].filterPath, req.body.data[i].name);
        if (fs.lstatSync(newDirectoryPath).isFile()) {
            promiseList.push(FileManagerDirectoryContent(req, res, newDirectoryPath, req.body.data[i].filterPath));
        } else {
            promiseList.push(FileManagerDirectoryContent(req, res, newDirectoryPath + "/", req.body.data[i].filterPath));
        }
    }
    Promise.all(promiseList).then(data => {
        data.forEach(function (files) {
            if (fs.lstatSync(path.join(contentRootPath + files.filterPath, files.name)).isFile()) {
                fs.unlinkSync(path.join(contentRootPath + files.filterPath, files.name));
            } else {
                deleteFolderRecursive(path.join(contentRootPath + files.filterPath, files.name));
            }
        });
        response = { files: data };
        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    });
}
/**
 * function to create the folder
 */
function createFolder(req, res, filepath) {
    var newDirectoryPath = path.join(contentRootPath + req.body.path, req.body.name);
    if (fs.existsSync(newDirectoryPath)) {
        var errorMsg = new Error();
        errorMsg.message = "A file or folder with the name " + req.body.name + " already exists.";
        errorMsg.code = "400";
        response = { error: errorMsg };

        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    } else {
        fs.mkdirSync(newDirectoryPath);
        (async () => {
            await FileManagerDirectoryContent(req, res, newDirectoryPath).then(data => {
                response = { files: data };
                response = JSON.stringify(response);
                res.setHeader('Content-Type', 'application/json');
                res.json(response);
            });
        })();
    }
}
/**
 * function to get the file details like path, name and size
 */
function fileDetails(req, res, filepath) {
    return new Promise((resolve, reject) => {
        var cwd = {};
        fs.stat(filepath, function (err, stats) {
            cwd.name = path.basename(filepath);
            cwd.size = getSize(stats.size);
            cwd.isFile = stats.isFile();
            cwd.modified = stats.ctime;
            cwd.created = stats.mtime;
            cwd.type = path.extname(filepath);
            cwd.location = filepath.substr(filepath.indexOf(req.body.path), filepath.length - 1);
            resolve(cwd);
        });
    });
}

/** 
 * function to get the folder size
 */
function getFolderSize(req, res, directory, sizeValue) {
    size = sizeValue;
    var filenames = fs.readdirSync(directory);
    for (var i = 0; i < filenames.length; i++) {
        if (fs.lstatSync(directory + "/" + filenames[i]).isDirectory()) {
            getFolderSize(req, res, directory + "/" + filenames[i], size);
        } else {
            const stats = fs.statSync(directory + "/" + filenames[i]);
            size = size + stats.size;
        }
    }
}

/**
 * function to get the size in kb, MB
 */
function getSize(size) {
    var hz;
    if (size < 1024) hz = size + ' B';
    else if (size < 1024 * 1024) hz = (size / 1024).toFixed(2) + ' KB';
    else if (size < 1024 * 1024 * 1024) hz = (size / 1024 / 1024).toFixed(2) + ' MB';
    else hz = (size / 1024 / 1024 / 1024).toFixed(2) + ' GB';
    return hz;
}

function checkForMultipleLocations(req, contentRootPath){
    var previousLocation = "";
    var isMultipleLocation = false;
    req.body.data.forEach(function(item){
        if (previousLocation == "") {
            previousLocation = item.filterPath;
            location =item.filterPath;
        } else if (previousLocation == item.filterPath && !isMultipleLocation) {
            isMultipleLocation = false;
            location = item.filterPath;
        } else {
            isMultipleLocation = true;
            location = "Various Location";
        }
    });
    if(!isMultipleLocation){
        location = contentRootPath.split("/")[contentRootPath.split("/").length - 1] + location.substr(0, location.length - 2);
    }
    return isMultipleLocation;
}
function getFileDetails(req, res, filterPath, contentRootPath) {
    var isNamesAvailable = req.body.names.length > 0 ? true : false;
    if (req.body.names.length == 0 && req.body.data != 0) {
        var nameValues = [];
        req.body.data.forEach(function (item) {
            nameValues.push(item.name);
        });
        req.body.names = nameValues;
    }
    if (req.body.names.length == 1) {
        fileDetails(req, res, filterPath + (isNamesAvailable ? req.body.names[0] : "")).then(data => {
            if (!data.isFile) {
                getFolderSize(req, res, filterPath + (isNamesAvailable ? req.body.names[0] : ""), 0);
                data.size = getSize(size);
                size = 0;
            }
            var RootIndex = data.location.indexOf(contentRootPath.split("/")[contentRootPath.split("/").length - 1]);
            if (RootIndex < 0) {
                data.location = contentRootPath.split("/")[contentRootPath.split("/").length - 1] + data.location;
            } else {
                data.location = data.location.substr(RootIndex, data.location.length - 1);
            }
            if (!isNamesAvailable) {
                data.location = data.location.substr(0, data.location.length - 1);
            }
            response = { details: data };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response);
        });
    } else {
        var isMultipleLocations = false;
        isMultipleLocations = checkForMultipleLocations(req, contentRootPath);
        req.body.names.forEach(function (item) {
            if (fs.lstatSync(filterPath + item).isDirectory()) {
                getFolderSize(req, res, filterPath + item, size);
            } else {
                const stats = fs.statSync(filterPath + item);
                size = size + stats.size;
            }
        });
        fileDetails(req, res, filterPath + req.body.names[0]).then(data => {
            var names = [];
            req.body.names.forEach(function (name) {
                if (name.split("/").length > 0) {
                    names.push(name.split("/")[name.split("/").length - 1]);
                }
                else {
                    names.push(name);
                }
            });
            data.name = names.join(", ");
            data.multipleFiles = true;
            data.size = getSize(size);
            size = 0;
            response = { details: data };
            response.details.location = location;
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            isMultipleLocations = false;
            location = "";
            res.json(response);
        });
    }
}

function copyFolder(source, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
    }
    files = fs.readdirSync(source);
    files.forEach(function (file) {
        var curSource = path.join(source, file);
        if (fs.lstatSync(curSource).isDirectory()) {
            copyFolder(curSource, path.join(dest, file)); source
        } else {
            fs.copyFileSync(path.join(source, file), path.join(dest, file), (err) => {
                if (err) throw err;
            });
        }
    });
}

function updateCopyName(path, name, count, isFile) {
    var subName = "", extension = "";
    if (isFile) {
        extension = name.substr(name.lastIndexOf('.'), name.length - 1);
        subName = name.substr(0, name.lastIndexOf('.'));
    }
    copyName = !isFile ? name + "(" + count + ")" : (subName + "(" + count + ")" + extension);
    if (checkForDuplicates(path, copyName, isFile)) {
        count = count + 1;
        updateCopyName(path, name, count, isFile);
    }
}

function checkForFileUpdate(fromPath, toPath, item, contentRootPath, req) {
    var count = 1;
    var name = copyName = item.name;
    if (fromPath == toPath) {
        if (checkForDuplicates(contentRootPath + req.body.targetPath, name, item.isFile)) {
            updateCopyName(contentRootPath + req.body.targetPath, name, count, item.isFile);
        }
    } else {
        if (req.body.renameFiles.length > 0 && req.body.renameFiles.indexOf(item.name) >= 0) {
            updateCopyName(contentRootPath + req.body.targetPath, name, count, item.isFile);
        } else {
            if (checkForDuplicates(contentRootPath + req.body.targetPath, name, item.isFile)) {
                isRenameChecking = true;
            }
        }
    }
}
/**
 * function copyfile and folder
 */
function CopyFiles(req, res, contentRootPath) {
    var fileList = [];
    var replaceFileList = [];
    req.body.data.forEach(function (item) {
        var fromPath = contentRootPath + item.filterPath + item.name;
        var toPath = contentRootPath + req.body.targetPath + item.name;
        checkForFileUpdate(fromPath, toPath, item, contentRootPath, req);
        if (!isRenameChecking) {
            toPath = contentRootPath + req.body.targetPath + copyName;
            if (item.isFile) {
                fs.copyFileSync(path.join(fromPath), path.join(toPath), (err) => {
                    if (err) throw err;
                });
            }
            else {
                copyFolder(fromPath, toPath)
            }
            var list = item;
            list.filterPath = req.body.targetPath;
            list.name = copyName;
            fileList.push(list);
        } else {
            replaceFileList.push(item.name);
        }
    });
    if (replaceFileList.length == 0) {
        copyName = "";
        response = { files: fileList };
        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    } else {
        isRenameChecking = false;
        var errorMsg = new Error();
        errorMsg.message = "File Already Exists.";
        errorMsg.code = "400";
        errorMsg.fileExists = replaceFileList;
        response = { error: errorMsg, files: [] };
        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    }
}

function MoveFolder(source, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
    }
    files = fs.readdirSync(source);
    files.forEach(function (file) {
        var curSource = path.join(source, file);
        if (fs.lstatSync(curSource).isDirectory()) {
            MoveFolder(curSource, path.join(dest, file));
            fs.rmdirSync(curSource);
        } else {
            fs.copyFileSync(path.join(source, file), path.join(dest, file), (err) => {
                if (err) throw err;
            });
            fs.unlinkSync(path.join(source, file), function (err) {
                if (err) throw err;
            });
        }
    });
}
/**
 * function move files and folder
 */
function MoveFiles(req, res, contentRootPath) {
    var fileList = [];
    var replaceFileList = [];
    req.body.data.forEach(function (item) {
        var fromPath = contentRootPath + item.filterPath + item.name;
        var toPath = contentRootPath + req.body.targetPath + item.name;
        checkForFileUpdate(fromPath, toPath, item, contentRootPath, req);
        if (!isRenameChecking) {
            toPath = contentRootPath + req.body.targetPath + copyName;
            if (item.isFile) {
                var source = fs.createReadStream(path.join(fromPath));
                var desti = fs.createWriteStream(path.join(toPath));
                source.pipe(desti);
                source.on('end', function () {
                    fs.unlinkSync(path.join(fromPath), function (err) {
                        if (err) throw err;
                    });
                });
            }
            else {
                MoveFolder(fromPath, toPath);
                fs.rmdirSync(fromPath);
            }
            var list = item;
            list.name = copyName;
            list.filterPath = req.body.targetPath;
            fileList.push(list);
        } else {
            replaceFileList.push(item.name);
        }
    });
    if (replaceFileList.length == 0) {
        copyName = "";
        response = { files: fileList };
        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    }
    else {
        isRenameChecking = false;
        var errorMsg = new Error();
        errorMsg.message = "File Already Exists.";
        errorMsg.code = "400";
        errorMsg.fileExists = replaceFileList;
        response = { error: errorMsg, files: [] };
        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    }
}

function getRelativePath(rootDirectory, fullPath) {
    if (rootDirectory.substring(rootDirectory.length - 1) == "/") {
        if (fullPath.indexOf(rootDirectory) >= 0) {
            return fullPath.substring(rootDirectory.length - 1);
        }
    }
    else if (fullPath.indexOf(rootDirectory + "/") >= 0) {
        return "/" + fullPath.substring(rootDirectory.length + 1);
    }
    else {
        return "";
    }
}
/**
 * returns the current working directories
 */
function FileManagerDirectoryContent(req, res, filepath, searchFilterPath) {
    return new Promise((resolve, reject) => {
        var cwd = {};
        fs.stat(filepath, function (err, stats) {
            cwd.name = path.basename(filepath);
            cwd.size = getSize(stats.size);
            cwd.isFile = stats.isFile();
            cwd.dateModified = stats.ctime;
            cwd.dateCreated = stats.mtime;
            cwd.type = path.extname(filepath);
            if (searchFilterPath) {
                cwd.filterPath = searchFilterPath;
            } else {
                cwd.filterPath = req.body.data.length > 0 ? getRelativePath(contentRootPath, contentRootPath + req.body.path.substring(0, req.body.path.indexOf(req.body.data[0].name))) : "";
            }
            if (fs.lstatSync(filepath).isFile()) {
                cwd.hasChild = false;
                resolve(cwd);
            }
        });
        if (fs.lstatSync(filepath).isDirectory()) {
            fs.readdir(filepath, function (err, stats) {
                stats.forEach(stat => {
                    if (fs.lstatSync(filepath + stat).isDirectory()) {
                        cwd.hasChild = true
                    } else {
                        cwd.hasChild = false;
                    }
                    if (cwd.hasChild) return;
                });
                resolve(cwd);
            });
        }
    });
}
//Multer to upload the files to the server
var fileName = [];
//MULTER CONFIG: to get file photos to temp server storage
const multerConfig = {
    //specify diskStorage (another option is memory)
    storage: multer.diskStorage({
        //specify destination
        destination: function (req, file, next) {
            next(null, './');
        },

        //specify the filename to be unique
        filename: function (req, file, next) {
            fileName.push(file.originalname);
            next(null, file.originalname);

        }
    }),

    // filter out and prevent non-image files.
    fileFilter: function (req, file, next) {
        next(null, true);
    }
};

/**
 * Gets the imageUrl from the client
 */
app.get('/GetImage', function (req, res) {
    var image = req.query.path.split("/").length > 1 ? req.query.path : "/" + req.query.path;
    fs.readFile(contentRootPath + image, function (err, content) {
        if (err) {
            res.writeHead(400, { 'Content-type': 'text/html' });
            res.end("No such image");
        } else {
            //specify the content type in the response will be an image
            res.writeHead(200, { 'Content-type': 'image/jpg' });
            res.end(content);
        }
    });
});

/**
 * Handles the upload request
 */
app.post('/Upload', multer(multerConfig).any('uploadFiles'), function (req, res) {
    var obj;
    for (var i = 0; i < fileName.length; i++) {
        fs.rename('./' + fileName[i], path.join(contentRootPath, req.body.path + fileName[i]), function (err) {
            if (err) throw err;
        });
    }
    res.send('Success');
    fileName = [];
});

/**
 * Download a file or folder
 */
app.post('/Download', function (req, res) {
    var downloadObj = JSON.parse(req.body.downloadInput);
    if (downloadObj.names.length === 1 && downloadObj.data[0].isFile) {
        var file = contentRootPath + downloadObj.path + downloadObj.names[0];
        res.download(file);
    } else {
        var archive = archiver('zip', {
            gzip: true,
            zlib: { level: 9 } // Sets the compression level.
        });
        var output = fs.createWriteStream('./Files.zip');
        downloadObj.data.forEach(function (item) {
            archive.on('error', function (err) {
                throw err;
            });
            if (item.isFile) {
                archive.file(contentRootPath + item.filterPath + item.name, { name: item.name });
            }
            else {
                archive.directory(contentRootPath + item.filterPath + item.name + "/", item.name);
            }
        });
        archive.pipe(output);
        archive.finalize();
        output.on('close', function () {
            var stat = fs.statSync(output.path);
            res.writeHead(200, {
                'Content-disposition': 'attachment; filename=Files.zip; filename*=UTF-8',
                'Content-Type': 'APPLICATION/octet-stream',
                'Content-Length': stat.size
            });
            var filestream = fs.createReadStream(output.path);
            filestream.pipe(res);
        });
    }
});

/**
 * Handles the read request
 */
app.post('/', function (req, res) {
    req.setTimeout(0);
    // Action for getDetails
    if (req.body.action == "details") {
        getFileDetails(req, res, contentRootPath + req.body.path, contentRootPath);
    }
    // Action for copying files
    if (req.body.action == "copy") {
        CopyFiles(req, res, contentRootPath);
    }
    // Action for movinh files
    if (req.body.action == "move") {
        MoveFiles(req, res, contentRootPath);
    }
    // Action to create a new folder
    if (req.body.action == "create") {
        createFolder(req, res, contentRootPath + req.body.path);
    }
    // Action to remove a file
    if (req.body.action == "delete") {
        deleteFolder(req, res, contentRootPath + req.body.path);
    }
    // Action to rename a file
    if (req.body.action === "rename") {
        renameFolder(req, res, contentRootPath + req.body.path);
    }

    function addSearchList(filename, contentRootPath, fileList, files, index) {
        var cwd = {};
        var stats = fs.statSync(filename);
        cwd.name = path.basename(filename);
        cwd.size = stats.size;
        cwd.isFile = stats.isFile();
        cwd.dateModified = stats.mtime;
        cwd.dateCreated = stats.ctime;
        cwd.type = path.extname(filename);
        cwd.filterPath = filename.substr((contentRootPath.length), filename.length).replace(files[index], "");
        if (fs.lstatSync(filename).isFile()) {
            cwd.hasChild = false;
        }
        if (fs.lstatSync(filename).isDirectory()) {
            var statsRead = fs.readdirSync(filename);
            cwd.hasChild = statsRead.length > 0;
        }
        fileList.push(cwd);
    }

    function checkForSearchResult(casesensitive, filter, isFile, fileName, searchString) {
        var isAddable = false;
        if (searchString.substr(0, 1) == "*" && searchString.substr(searchString.length - 1, 1) == "*") {
            if (casesensitive ? fileName.indexOf(filter) >= 0 : (fileName.indexOf(filter.toLowerCase()) >= 0 || fileName.indexOf(filter.toUpperCase()) >= 0)) {
                isAddable = true
            }
        } else if (searchString.substr(searchString.length - 1, 1) == "*") {
            if (casesensitive ? fileName.startsWith(filter) : (fileName.startsWith(filter.toLowerCase())|| fileName.startsWith(filter.toUpperCase()))) {
                isAddable = true
            }
        } else {
            if (casesensitive ? fileName.endsWith(filter) : (fileName.endsWith(filter.toLowerCase()) || fileName.endsWith(filter.toUpperCase()))) {
                isAddable = true
            }
        }
        return isAddable;
    }

    function fromDir(startPath, filter, contentRootPath, casesensitive, searchString) {
        if (!fs.existsSync(startPath)) {
            return;
        }
        var files = fs.readdirSync(startPath);
        for (var i = 0; i < files.length; i++) {
            var filename = path.join(startPath, files[i]);
            var stat = fs.lstatSync(filename);
            if (stat.isDirectory()) {
                if (checkForSearchResult(casesensitive, filter, false, files[i], searchString)) {
                    addSearchList(filename, contentRootPath, fileList, files, i);
                }
                fromDir(filename, filter, contentRootPath, casesensitive, searchString); //recurse
            }
            else if (checkForSearchResult(casesensitive, filter, true, files[i], searchString)) {
                addSearchList(filename, contentRootPath, fileList, files, i);
            }
        }
    }

    // Action to search a file
    if (req.body.action === 'search') {
        var fileList = [];
        fromDir(contentRootPath + req.body.path, req.body.searchString.replace(/\*/g, ""), contentRootPath, req.body.caseSensitive, req.body.searchString);
        (async () => {
            const tes = await FileManagerDirectoryContent(req, res, contentRootPath + req.body.path);
            response = { cwd: tes, files: fileList };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response);
        })();
    }

    function ReadDirectories(file) {
        var cwd = {};
        var directoryList = [];
        function stats(file) {
            return new Promise((resolve, reject) => {
                fs.stat(file, (err, cwd) => {
                    if (err) {
                        return reject(err);
                    }
                    cwd.name = path.basename(contentRootPath + req.body.path + file);
                    cwd.size = (cwd.size);
                    cwd.isFile = cwd.isFile();
                    cwd.dateModified = cwd.ctime;
                    cwd.dateCreated = cwd.mtime;
                    cwd.filterPath = getRelativePath(contentRootPath, contentRootPath + req.body.path, req);
                    cwd.type = path.extname(contentRootPath + req.body.path + file);
                    if (fs.lstatSync(file).isDirectory()) {
                        fs.readdirSync(file).forEach(function (items) {
                            if (fs.statSync(path.join(file, items)).isDirectory()) {
                                directoryList.push(items[i]);
                            }
                            if (directoryList.length > 0) {
                                cwd.hasChild = true;
                            } else {
                                cwd.hasChild = false;
                                directoryList = [];
                            }
                        });
                    } else {
                        cwd.hasChild = false;
                        dir = [];
                    }
                    directoryList = [];
                    resolve(cwd);
                });
            });
        }
        var promiseList = [];
        for (var i = 0; i < file.length; i++) {
            promiseList.push(stats(path.join(contentRootPath + req.body.path, file[i])));
        }
        return Promise.all(promiseList);
    }

    // Action to read a file
    if (req.body.action == "read") {
        (async () => {
            const filesList = await GetFiles(req, res);
            const cwdFiles = await FileManagerDirectoryContent(req, res, contentRootPath + req.body.path);
            var response = {};
            ReadDirectories(filesList).then(data => {
                response = { cwd: cwdFiles, files: data };
                response = JSON.stringify(response);
                res.setHeader('Content-Type', 'application/json');
                res.json(response);
            });
        })();
    }

});
/**
 * Server serving port
 */
var runPort = process.env.PORT || 8090;
var server = app.listen(runPort, function () {
    server.setTimeout(10 * 60 * 1000);
    var host = server.address().address;
    var port = server.address().port;
    console.log("Example app listening at http://%s:%s", host, port);
});