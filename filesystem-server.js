/*jshint esversion: 8 */
var express = require('express');
var yargs = require('yargs');
var app = express();
var size = 0;
var copyName = "";
var location = "";
var isRenameChecking = false;
var accessDetails = null;
const path = require('path');
const bodyParser = require("body-parser");
const archiver = require('archiver');
const multer = require('multer');
const fs = require('fs');
var cors = require('cors');
const pattern = /(\.\.\/)/g;

var contentRootPath = yargs.argv.d;
contentRootPath=contentRootPath.replace("../","");

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(cors());

var Permission = {
    Allow: "allow",
    Deny: "deny"
};

class AccessDetails {
    constructor(role, rules) {
        this.role = role;
        this.rules = rules;
    }
}

class AccessPermission {
    constructor(read, write, writeContents, copy, download, upload, message) {
        this.read = read;
        this.write = write;
        this.writeContents = writeContents;
        this.copy = copy;
        this.download = download;
        this.upload = upload;
        this.message = message
    }
}

class AccessRules {
    constructor(path, role, read, write, writeContents, copy, download, upload, isFile, message) {
        this.path = path;
        this.role = role;
        this.read = read;
        this.write = write;
        this.writeContents = writeContents;
        this.copy = copy;
        this.download = download;
        this.upload = upload;
        this.isFile = isFile;
        this.message = message
    }
}
/**
 * Reads text from the file asynchronously and returns a Promise.
 */
function GetFiles(req, res) {
    return new Promise((resolve, reject) => {
        fs.readdir(contentRootPath + req.body.path.replace(pattern, ""), function (err, files) {
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
    const resolvedOldDirectoryPath = path.resolve(contentRootPath + req.body.data[0].filterPath, oldName);
    const resolvedNewDirectoryPath = path.resolve(contentRootPath + req.body.data[0].filterPath, newName);
    const fullOldPath = (contentRootPath + req.body.data[0].filterPath + oldName ).replace(/[\\/]/g, "\\");
    const fullNewPath = (contentRootPath + req.body.data[0].filterPath + newName ).replace(/[\\/]/g, "\\");
    const isValidateOldPath = fullOldPath == resolvedOldDirectoryPath ? true : false;
    const isValidateNewPath = fullNewPath == resolvedNewDirectoryPath ? true : false;
    if(!isValidateOldPath || !isValidateNewPath){
        var errorMsg = new Error();
        errorMsg.message = "Access denied for Directory-traversal";
        errorMsg.code = "401";
        response = { error: errorMsg };
        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    }
    var permission = getPermission((contentRootPath + req.body.data[0].filterPath), oldName, req.body.data[0].isFile, contentRootPath, req.body.data[0].filterPath);
    if (permission != null && (!permission.read || !permission.write)) {
        var errorMsg = new Error();
        errorMsg.message = (permission.message !== "") ? permission.message : getFileName(contentRootPath + req.body.data[0].filterPath + oldName) + " is not accessible.  is not accessible. You need permission to perform the write action.";
        errorMsg.code = "401";
        response = { error: errorMsg };
        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    } else {
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
}
/**
 * function to delete the folder
 */
function deleteFolder(req, res, contentRootPath) {
    var deleteFolderRecursive = function (path) {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function (file, index) {
                var curPath = path + "/" + file;
                curPath=curPath.replace("../","");
                if (fs.lstatSync(curPath).isDirectory()) { // recurse
                    deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    };
    var permission; var permissionDenied = false;
    req.body.data.forEach(function (item) {
        const resolvedPath = path.join(contentRootPath + item.filterPath, item.name);
        const fullPath = (contentRootPath + item.filterPath + item.name ).replace(/[\\/]/g, "\\");
        const isValidatePath = fullPath == resolvedPath ? true : false;
        if(!isValidatePath){
            var errorMsg = new Error();
            errorMsg.message = "Access denied for Directory-traversal";
            errorMsg.code = "401";
            response = { error: errorMsg };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response);
        }
        var fromPath = contentRootPath + item.filterPath;
        permission = getPermission(fromPath, item.name, item.isFile, contentRootPath, item.filterPath);
        if (permission != null && (!permission.read || !permission.write)) {
            permissionDenied = true;
            var errorMsg = new Error();
            errorMsg.message = (permission.message !== "") ? permission.message : item.name + " is not accessible. You need permission to perform the write action.";
            errorMsg.code = "401";
            response = { error: errorMsg };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response);
        }
    });
    if (!permissionDenied) {
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
}
/**
 * function to create the folder
 */
function createFolder(req, res, filepath, contentRootPath) {
    var newDirectoryPath = path.join(contentRootPath + req.body.path, req.body.name);
    const resolvedPath = newDirectoryPath.replace(/[\\/]/g, "\\\\");
    const fullPath = (contentRootPath + req.body.path+req.body.name).replace(/\//g, "\\\\");
    const isValidatePath = fullPath == resolvedPath ? true : false;
    if(!isValidatePath){
        var errorMsg = new Error();
        errorMsg.message = "Access denied for Directory-traversal";
        errorMsg.code = "401";
        response = { error: errorMsg };
        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    }
    var pathPermission = getPathPermission(req.path, false, req.body.data[0].name, filepath, contentRootPath, req.body.data[0].filterPath);
    if (pathPermission != null && (!pathPermission.read || !pathPermission.writeContents)) {
        var errorMsg = new Error();
        errorMsg.message = (permission.message !== "") ? permission.message : req.body.data[0].name + " is not accessible. You need permission to perform the writeContents action.";
        errorMsg.code = "401";
        response = { error: errorMsg };
        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    }
    else {
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
            cwd.location = req.body.data[0].filterPath
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

function checkForMultipleLocations(req, contentRootPath) {
    var previousLocation = "";
    var isMultipleLocation = false;
    req.body.data.forEach(function (item) {
        if (previousLocation == "") {
            previousLocation = item.filterPath;
            location = item.filterPath;
        } else if (previousLocation == item.filterPath && !isMultipleLocation) {
            isMultipleLocation = false;
            location = item.filterPath;
        } else {
            isMultipleLocation = true;
            location = "Various Location";
        }
    });
    if (!isMultipleLocation) {
        location = contentRootPath.split("/")[contentRootPath.split("/").length - 1] + location.substr(0, location.length - 2);
    }
    return isMultipleLocation;
}
function getFileDetails(req, res, contentRootPath, filterPath) {
    req.body.data.forEach(function (item) {
        const resolvedPath = path.resolve(contentRootPath + item.filterPath, item.name);
        const fullPath = (contentRootPath.replace(/\/+$/, '') + item.filterPath + item.name ).replace(/[\\/]/g, "\\");
        const isValidatePath = fullPath == resolvedPath ? true : false;
        if(!isValidatePath){
            var errorMsg = new Error();
            errorMsg.message = "Access denied for Directory-traversal";
            errorMsg.code = "401";
            response = { error: errorMsg };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response);
        }
    });
    var isNamesAvailable = req.body.names.length > 0 ? true : false;
    if (req.body.names.length == 0 && req.body.data != 0) {
        var nameValues = [];
        req.body.data.forEach(function (item) {
            nameValues.push(item.name);
        });
        req.body.names = nameValues;
    }
    if (req.body.names.length == 1) {
        fileDetails(req, res, contentRootPath + (isNamesAvailable ? req.body.names[0] : "")).then(data => {
            if (!data.isFile) {
                getFolderSize(req, res, contentRootPath + (isNamesAvailable ? req.body.names[0] : ""), 0);
                data.size = getSize(size);
                size = 0;
            }
            if (filterPath == "") {
                data.location = path.join(filterPath, req.body.names[0]).substr(0, path.join(filterPath, req.body.names[0]).length);
            } else {
                data.location = path.join(rootName, filterPath, req.body.names[0]);
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
            if (fs.lstatSync(contentRootPath + item).isDirectory()) {
                getFolderSize(req, res, contentRootPath + item, size);
            } else {
                const stats = fs.statSync(contentRootPath + item);
                size = size + stats.size;
            }
        });
        fileDetails(req, res, contentRootPath + req.body.names[0]).then(data => {
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
            if (filterPath == "") {
                data.location = path.join(rootName, filterPath).substr(0, path.join(rootName, filterPath).length - 1);
            } else {
                data.location = path.join(rootName, filterPath).substr(0, path.join(rootName, filterPath).length - 1);
            }
            response = { details: data };
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
        curSource=curSource.replace("../","");
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
    var permission; var pathPermission; var permissionDenied = false;
    pathPermission = getPathPermission(req.path, false, req.body.targetData.name, contentRootPath + req.body.targetPath, contentRootPath, req.body.targetData.filterPath);
    req.body.data.forEach(function (item) {
        const resolvedPath = path.join(contentRootPath + item.filterPath, item.name);
        const fullPath = (contentRootPath + item.filterPath + item.name ).replace(/[\\/]/g, "\\");
        const isValidatePath = fullPath == resolvedPath ? true : false;
        if(!isValidatePath){
            var errorMsg = new Error();
            errorMsg.message = "Access denied for Directory-traversal";
            errorMsg.code = "401";
            response = { error: errorMsg };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response);
        }
        var fromPath = contentRootPath + item.filterPath;
        permission = getPermission(fromPath, item.name, item.isFile, contentRootPath, item.filterPath);
        var fileAccessDenied = (permission != null && (!permission.read || !permission.copy));
        var pathAccessDenied = (pathPermission != null && (!pathPermission.read || !pathPermission.writeContents));
        if (fileAccessDenied || pathAccessDenied) {
            permissionDenied = true;
            var errorMsg = new Error();
            errorMsg.message = fileAccessDenied ? ((permission.message !== "") ? permission.message :
                item.name + " is not accessible. You need permission to perform the copy action.") :
                ((pathPermission.message !== "") ? pathPermission.message :
                    req.body.targetData.name + " is not accessible. You need permission to perform the writeContents action.");
            errorMsg.code = "401";
            response = { error: errorMsg };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response);
        }
    });
    if (!permissionDenied) {
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
}

function MoveFolder(source, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest);
    }
    files = fs.readdirSync(source);
    files.forEach(function (file) {
        var curSource = path.join(source, file);
        curSource=curSource.replace("../","");
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
    var permission; var pathPermission; var permissionDenied = false;
    pathPermission = getPathPermission(req.path, false, req.body.targetData.name, contentRootPath + req.body.targetPath, contentRootPath, req.body.targetData.filterPath);
    req.body.data.forEach(function (item) {
        const resolvedPath = path.join(contentRootPath + item.filterPath, item.name);
        const fullPath = (contentRootPath + item.filterPath + item.name ).replace(/[\\/]/g, "\\");
        const isValidatePath = fullPath == resolvedPath ? true : false;
        if(!isValidatePath){
            var errorMsg = new Error();
            errorMsg.message = "Access denied for Directory-traversal";
            errorMsg.code = "401";
            response = { error: errorMsg };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response);
        }
        var fromPath = contentRootPath + item.filterPath;
        permission = getPermission(fromPath, item.name, item.isFile, contentRootPath, item.filterPath);
        var fileAccessDenied = (permission != null && (!permission.read || !permission.write));
        var pathAccessDenied = (pathPermission != null && (!pathPermission.read || !pathPermission.writeContents));
        if (fileAccessDenied || pathAccessDenied) {
            permissionDenied = true;
            var errorMsg = new Error();
            errorMsg.message = fileAccessDenied ? ((permission.message !== "") ? permission.message :
                item.name + " is not accessible. You need permission to perform the write action.") :
                ((pathPermission.message !== "") ? pathPermission.message :
                    req.body.targetData.name + " is not accessible. You need permission to perform the writeContents action.");
            errorMsg.code = "401";
            response = { error: errorMsg };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response);
        }
    });
    if (!permissionDenied) {
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

function hasPermission(rule) {
    return ((rule == undefined) || (rule == null) || (rule == Permission.Allow)) ? true : false;
}

function getMessage(rule) {
    return ((rule.message == undefined) || (rule.message == null)) ? "" : rule.message;
}

function updateRules(filePermission, accessRule) {
    filePermission.download = hasPermission(accessRule.read) && hasPermission(accessRule.download);
    filePermission.write = hasPermission(accessRule.read) && hasPermission(accessRule.write);
    filePermission.writeContents = hasPermission(accessRule.read) && hasPermission(accessRule.writeContents);
    filePermission.copy = hasPermission(accessRule.read) && hasPermission(accessRule.copy);
    filePermission.read = hasPermission(accessRule.read);
    filePermission.upload = hasPermission(accessRule.read) && hasPermission(accessRule.upload);
    filePermission.message = getMessage(accessRule);
    return filePermission;
}

function getPathPermission(path, isFile, name, filepath, contentRootPath, filterPath) {
    return getPermission(filepath, name, isFile, contentRootPath, filterPath);
}

function getPermission(filepath, name, isFile, contentRootPath, filterPath) {
    var filePermission = new AccessPermission(true, true, true, true, true, true, "");
    if (accessDetails == null) {
        return null;
    } else {
        accessDetails.rules.forEach(function (accessRule) {
            if (isFile && accessRule.isFile) {
                var nameExtension = name.substr(name.lastIndexOf("."), name.length - 1).toLowerCase();
                var fileName = name.substr(0, name.lastIndexOf("."));
                var currentPath = contentRootPath + filterPath;
                if (accessRule.isFile && isFile && accessRule.path != "" && accessRule.path != null && (accessRule.role == null || accessRule.role == accessDetails.role)) {
                    if (accessRule.path.indexOf("*.*") > -1) {
                        var parentPath = accessRule.path.substr(0, accessRule.path.indexOf("*.*"));
                        if (currentPath.indexOf(contentRootPath + parentPath) == 0 || parentPath == "") {
                            filePermission = updateRules(filePermission, accessRule);
                        }
                    }
                    else if (accessRule.path.indexOf("*.") > -1) {
                        var pathExtension = accessRule.path.substr(accessRule.path.lastIndexOf("."), accessRule.path.length - 1).toLowerCase();
                        var parentPath = accessRule.path.substr(0, accessRule.path.indexOf("*."));
                        if (((contentRootPath + parentPath) == currentPath || parentPath == "") && nameExtension == pathExtension) {
                            filePermission = updateRules(filePermission, accessRule);
                        }
                    }
                    else if (accessRule.path.indexOf(".*") > -1) {
                        var pathName = accessRule.path.substr(0, accessRule.path.lastIndexOf(".")).substr(accessRule.path.lastIndexOf("/") + 1, accessRule.path.length - 1);
                        var parentPath = accessRule.path.substr(0, accessRule.path.indexOf(pathName + ".*"));
                        if (((contentRootPath + parentPath) == currentPath || parentPath == "") && fileName == pathName) {
                            filePermission = updateRules(filePermission, accessRule);
                        }
                    }
                    else if (contentRootPath + accessRule.path == filepath) {
                        filePermission = updateRules(filePermission, accessRule);
                    }
                }
            } else {
                if (!accessRule.isFile && !isFile && accessRule.path != null && (accessRule.role == null || accessRule.role == accessDetails.role)) {
                    var parentFolderpath = contentRootPath + filterPath;
                    if (accessRule.path.indexOf("*") > -1) {
                        var parentPath = accessRule.path.substr(0, accessRule.path.indexOf("*"));
                        if (((parentFolderpath + (parentFolderpath[parentFolderpath.length - 1] == "/" ? "" : "/") + name).lastIndexOf(contentRootPath + parentPath) == 0) || parentPath == "") {
                            filePermission = updateRules(filePermission, accessRule);
                        }
                    } else if (path.join(contentRootPath, accessRule.path) == path.join(parentFolderpath, name) || path.join(contentRootPath, accessRule.path) == path.join(parentFolderpath, name + "/")) {
                        filePermission = updateRules(filePermission, accessRule);
                    }
                    else if (path.join(parentFolderpath, name).lastIndexOf(path.join(contentRootPath, accessRule.path)) == 0) {
                        filePermission.write = hasPermission(accessRule.writeContents);
                        filePermission.writeContents = hasPermission(accessRule.writeContents);
                        filePermission.message = getMessage(accessRule);
                    }
                }
            }
        });
        return filePermission;
    }
}
/**
 * returns the current working directories
 */
function FileManagerDirectoryContent(req, res, filepath, searchFilterPath) {
    return new Promise((resolve, reject) => {
        var cwd = {};
        replaceRequestParams(req, res);
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
                cwd.filterPath = req.body.data.length > 0 ? req.body.path : "";
            }
            cwd.permission = getPathPermission(req.path, cwd.isFile, (req.body.path == "/") ? "" : cwd.name, filepath, contentRootPath, cwd.filterPath);
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

function replaceRequestParams(req, res) {
    req.body.path = (req.body.path && req.body.path.replace(pattern, ""));
}
/**
 * Gets the imageUrl from the client
 */
app.get('/GetImage', function (req, res) {
    replaceRequestParams(req, res);
    var image = req.query.path.split("/").length > 1 ? req.query.path : "/" + req.query.path;
    const resolvedPath = path.resolve(contentRootPath + image.substr(0, image.lastIndexOf("/")), image.substr(image.lastIndexOf("/") + 1, image.length - 1));
    const fullPath = (contentRootPath + image).replace(/[\\/]/g, "\\");
    const isValidatePath = fullPath == resolvedPath ? true : false;
    if(!isValidatePath){
        var errorMsg = new Error();
        errorMsg.message = "Access denied for Directory-traversal";
        errorMsg.code = "401";
        response = { error: errorMsg };
        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    }
    var pathPermission = getPermission(contentRootPath + image.substr(0, image.lastIndexOf("/")), image.substr(image.lastIndexOf("/") + 1, image.length - 1), true, contentRootPath, image.substr(0, image.lastIndexOf("/")));
    if (pathPermission != null && !pathPermission.read) {
        return null;
    }
    else {
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
    }
});

/**
 * Handles the upload request
 */
app.post('/Upload', multer(multerConfig).any('uploadFiles'), function (req, res) {
    replaceRequestParams(req, res);
    const checkTraversalPath = path.resolve(contentRootPath + req.body.path).replace(/[\\/]/g, "\\\\")+"\\\\";
    const actualPath = (contentRootPath + req.body.path).replace(/\//g, "\\\\");
    const isPathTraversal = checkTraversalPath == actualPath ? true : false;
    if(!isPathTraversal){
        var errorMsg = new Error();
        errorMsg.message = "Access denied for Directory-traversal";
        errorMsg.code = "401";
        response = { error: errorMsg };
        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    }
    var pathPermission = req.body.data != null ? getPathPermission(req.path, true, JSON.parse(req.body.data).name, contentRootPath + req.body.path, contentRootPath, JSON.parse(req.body.data).filterPath) : null;
    if (pathPermission != null && (!pathPermission.read || !pathPermission.upload)) {
        var errorMsg = new Error();
        errorMsg.message = (permission.message !== "") ? permission.message :
            JSON.parse(req.body.data).name + " is not accessible. You need permission to perform the upload action.";
        errorMsg.code = "401";
        response = { error: errorMsg };
        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    } else if(req.body != null && req.body.path != null) {
        var errorValue = new Error();
        if(req.body.action === 'save'){
            var folders = (req.body.filename).split('/');
            var filepath = req.body.path;
            var uploadedFileName = folders[folders.length - 1];
            // checking the folder upload
            if (folders.length > 1)
            {
                for (var i = 0; i < folders.length - 1; i++)
                {
                    var newDirectoryPath = path.join(contentRootPath + filepath, folders[i]);
                    const fullPath = (contentRootPath + filepath + folders[i]).replace(/[\\/]/g, "\\");
                    const isValidatePath = fullPath == newDirectoryPath ? true : false;
                    if(!isValidatePath){
                        var errorMsg = new Error();
                        errorMsg.message = "Access denied for Directory-traversal";
                        errorMsg.code = "401";
                        response = { error: errorMsg };
                        response = JSON.stringify(response);
                        res.setHeader('Content-Type', 'application/json');
                        res.json(response);
                    }
                    if (!fs.existsSync(newDirectoryPath)) {
                        fs.mkdirSync(newDirectoryPath);
                        (async () => {
                           await FileManagerDirectoryContent(req, res, newDirectoryPath).then(data => {
                                response = { files: data };
                                response = JSON.stringify(response);
                           });
                        })();
                    }
                    filepath += folders[i] + "/";
                }
                fs.rename('./' + uploadedFileName, path.join(contentRootPath, filepath + uploadedFileName), function (err) {
                    if (err) {
                        if (err.code != 'EBUSY') {
                            errorValue.message = err.message;
                            errorValue.code = err.code;
                        }
                    }
                });
            } else {
            for (var i = 0; i < fileName.length; i++) {
                const resolvedPath = path.join(contentRootPath + filepath, fileName[i]);
                const fullPath = (contentRootPath + filepath + fileName[i]).replace(/[\\/]/g, "\\");
                const isValidatePath = fullPath == resolvedPath ? true : false;
                if(!isValidatePath){
                    var errorMsg = new Error();
                    errorMsg.message = "Access denied for Directory-traversal";
                    errorMsg.code = "401";
                    response = { error: errorMsg };
                    response = JSON.stringify(response);
                    res.setHeader('Content-Type', 'application/json');
                    res.json(response);
                }
                fs.rename('./' + fileName[i], path.join(contentRootPath, filepath + fileName[i]), function (err) {
                    if (err) {
                        if (err.code != 'EBUSY') {
                            errorValue.message = err.message;
                            errorValue.code = err.code;
                        }
                    }
                });
            }
            }
        } else if(req.body.action === 'remove') {
            if (fs.existsSync(path.join(contentRootPath, req.body.path + req.body["cancel-uploading"]))) {
                fs.unlinkSync(path.join(contentRootPath, req.body.path + req.body["cancel-uploading"]));
            }
        }        
        if(errorValue != null) {
            response = { error: errorValue };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');            
        }
        res.send('Success');
        fileName = [];
    }
});

/**
 * Download a file or folder
 */
app.post('/Download', function (req, res) {
    replaceRequestParams(req, res);
    var downloadObj = JSON.parse(req.body.downloadInput);
    var permission; var permissionDenied = false;
    downloadObj.data.forEach(function (item) {
        const resolvedPath = path.join(contentRootPath + item.filterPath, item.name);
        const fullPath = (contentRootPath + item.filterPath + item.name).replace(/\//g, "\\");
        const isValidatePath = fullPath == resolvedPath ? true : false;
        if(!isValidatePath){
            var errorMsg = new Error();
            errorMsg.message = "Access denied for Directory-traversal";
            errorMsg.code = "401";
            response = { error: errorMsg };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response);
        }
        var filepath = (contentRootPath + item.filterPath).replace(/\\/g, "/");
        permission = getPermission(filepath + item.name, item.name, item.isFile, contentRootPath, item.filterPath);
        if (permission != null && (!permission.read || !permission.download)) {
            permissionDenied = true;
            var errorMsg = new Error();
            errorMsg.message = (permission.message !== "") ? permission.message : getFileName(contentRootPath + item.filterPath + item.name) + " is not accessible. You need permission to perform the download action.";
            errorMsg.code = "401";
            response = { error: errorMsg };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response);
        }
    });
    if (!permissionDenied) {
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
    }
});

/**
 * Handles the read request
 */
app.post('/', function (req, res) {
    replaceRequestParams(req, res);
    req.setTimeout(0);
    function getRules() {
        var details = new AccessDetails();
        var accessRuleFile = "accessRules.json";
        if (!fs.existsSync(accessRuleFile)) { return null; }
        var rawData = fs.readFileSync(accessRuleFile);
        if (rawData.length === 0) { return null; }
        var parsedData = JSON.parse(rawData);
        var data = parsedData.rules;
        var accessRules = [];
        for (var i = 0; i < data.length; i++) {
            var rule = new AccessRules(data[i].path, data[i].role, data[i].read, data[i].write, data[i].writeContents, data[i].copy, data[i].download, data[i].upload, data[i].isFile, data[i].message);
            accessRules.push(rule);
        }
        if (accessRules.length == 1 && accessRules[0].path == undefined) {
            return null;
        } else {
            details.rules = accessRules;
            details.role = parsedData.role;
            return details;
        }
    }

    accessDetails = getRules();

    // Action for getDetails
    if (req.body.action == "details") {
        getFileDetails(req, res, contentRootPath + req.body.path, req.body.data[0].filterPath);
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
        createFolder(req, res, contentRootPath + req.body.path, contentRootPath);
    }
    // Action to remove a file
    if (req.body.action == "delete") {
        deleteFolder(req, res, contentRootPath);
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
        cwd.permission = getPermission(filename.replace(/\\/g, "/"), cwd.name, cwd.isFile, contentRootPath, cwd.filterPath);
        var permission = parentsHavePermission(filename, contentRootPath, cwd.isFile, cwd.name, cwd.filterPath);
        if (permission) {
            if (fs.lstatSync(filename).isFile()) {
                cwd.hasChild = false;
            }
            if (fs.lstatSync(filename).isDirectory()) {
                var statsRead = fs.readdirSync(filename);
                cwd.hasChild = statsRead.length > 0;
            }
            fileList.push(cwd);
        }
    }

    function parentsHavePermission(filepath, contentRootPath, isFile, name, filterPath) {
        var parentPath = filepath.substr(contentRootPath.length, filepath.length - 1).replace(/\\/g, "/");
        parentPath = parentPath.substr(0, parentPath.indexOf(name)) + (isFile ? "" : "/");
        var parents = parentPath.split('/');
        var currPath = "/";
        var hasPermission = true;
        var pathPermission;
        for (var i = 0; i <= parents.length - 2; i++) {
            currPath = (parents[i] == "") ? currPath : (currPath + parents[i] + "/");
            pathPermission = getPathPermission(parentPath, false, parents[i], contentRootPath + (currPath == "/" ? "" : "/"), contentRootPath, filterPath);
            if (pathPermission == null) {
                break;
            }
            else if (pathPermission != null && !pathPermission.read) {
                hasPermission = false;
                break;
            }
        }
        return hasPermission;
    }

    function checkForSearchResult(casesensitive, filter, isFile, fileName, searchString) {
        var isAddable = false;
        if (searchString.substr(0, 1) == "*" && searchString.substr(searchString.length - 1, 1) == "*") {
            if (casesensitive ? fileName.indexOf(filter) >= 0 : (fileName.indexOf(filter.toLowerCase()) >= 0 || fileName.indexOf(filter.toUpperCase()) >= 0)) {
                isAddable = true
            }
        } else if (searchString.substr(searchString.length - 1, 1) == "*") {
            if (casesensitive ? fileName.startsWith(filter) : (fileName.startsWith(filter.toLowerCase()) || fileName.startsWith(filter.toUpperCase()))) {
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
        const resolvedPath = path.resolve(contentRootPath + req.body.path).replace(/[\\/]/g, "\\\\")+"\\\\";
        const fullPath = (contentRootPath + req.body.path).replace(/\//g, "\\\\");
        const isValidatePath = fullPath == resolvedPath ? true : false;
        if(!isValidatePath){
            var errorMsg = new Error();
            errorMsg.message = "Access denied for Directory-traversal";
            errorMsg.code = "401";
            response = { error: errorMsg };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response);
        }
        var fileList = [];
        fromDir(contentRootPath + req.body.path, req.body.searchString.replace(/\*/g, ""), contentRootPath, req.body.caseSensitive, req.body.searchString);
        (async () => {
            const tes = await FileManagerDirectoryContent(req, res, contentRootPath + req.body.path);
            if (tes.permission != null && !tes.permission.read) {
                var errorMsg = new Error();
                errorMsg.message = (permission.message !== "") ? permission.message :
                    "'" + getFileName(contentRootPath + (req.body.path.substring(0, req.body.path.length - 1))) + "' is not accessible. You need permission to perform the read action.";
                errorMsg.code = "401";
                response = { error: errorMsg };
                response = JSON.stringify(response);
                res.setHeader('Content-Type', 'application/json');
                res.json(response);
            } else {
                response = { cwd: tes, files: fileList };
                response = JSON.stringify(response);
                res.setHeader('Content-Type', 'application/json');
                res.json(response);
            }
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
                    cwd.permission = getPermission(contentRootPath + req.body.path + cwd.name, cwd.name, cwd.isFile, contentRootPath, cwd.filterPath);
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
            promiseList.push(stats(path.join(contentRootPath + req.body.path.replace(pattern, ""), file[i])));
        }
        return Promise.all(promiseList);
    }

    // Action to read a file
    if (req.body.action == "read") {
        (async () => {
            const resolvedPath = path.resolve(contentRootPath + req.body.path).replace(/[\\/]/g, "\\\\")+"\\\\";
            const fullPath = (contentRootPath + req.body.path).replace(/\//g, "\\\\");
            const isValidatePath = fullPath == resolvedPath ? true : false;
            const filesList = await GetFiles(req, res);
            const cwdFiles = await FileManagerDirectoryContent(req, res, contentRootPath + req.body.path);
            cwdFiles.name = req.body.path == "/" ? rootName = (path.basename(contentRootPath + req.body.path)) : path.basename(contentRootPath + req.body.path)
            var response = {};
            if(!isValidatePath)
            {
                var errorMsg = new Error();
                errorMsg.message = "Access denied for Directory-traversal.";
                errorMsg.code = "401";
                response = { cwd: cwdFiles, files: null, error: errorMsg };
                response = JSON.stringify(response);
                res.setHeader('Content-Type', 'application/json');
                res.json(response);
            }
            if (cwdFiles.permission != null && !cwdFiles.permission.read) {
                var errorMsg = new Error();
                errorMsg.message = (cwdFiles.permission.message !== "") ? cwdFiles.permission.message :
                    "'" + cwdFiles.name + "' is not accessible. You need permission to perform the read action.";
                errorMsg.code = "401";
                response = { cwd: cwdFiles, files: null, error: errorMsg };
                response = JSON.stringify(response);
                res.setHeader('Content-Type', 'application/json');
                res.json(response);
            }
            else {
                ReadDirectories(filesList).then(data => {
                    response = { cwd: cwdFiles, files: data };
                    response = JSON.stringify(response);
                    res.setHeader('Content-Type', 'application/json');
                    res.json(response);
                });
            }
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