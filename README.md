# NodeJS file system providers for Essential JS 2 File Manager 

This repository contains the nodeJS file system provider used for Essential JS 2 File Manager component.

## Key Features

The Node.js file system provider module allows you to work with the physical file system. It also provides the methods for performing various file actions like creating a new folder, renaming files, and deleting files.

NodeJs File System Provider Serves the file system providers support for the  FileManager component with the NodeJS.

The following actions can be performed with NodeJS file system provider.

| **Actions** | **Description** |
| --- | --- |
| Read      | Reads the files from NodeJS file system. |
| Details   | Gets the file's details which consists of Type, Size, Location and Modified date. |
| Download  | Downloads the selected file or folder from NodeJS file system. |
| Upload    | Uploads a file in NodeJS file system. It accepts uploaded media with the following characteristics: <ul><li>Maximum file size:  30MB</li><li>Accepted Media MIME types: `*/*` </li></ul> |
| Create    | Creates a New folder. |
| Delete    | Deletes a folder or file. |
| Copy      | Copys the selected files or folders from target. |
| Move      | Moves the files or folders to the desired location. |
| Rename    | Renames a folder or file. |
| Search    | Full-text questions perform linguistic searches against text data in full-text indexes by operating on words and phrases. |

## Access Control

The EJ2 FileManager allows you to define access permissions for files and folders using a set of access rules to user(s). The rules and roles should be specified in the `accessRules.json` available in the root folder of the package. The following table represents the access rule properties available for the files and folders.

| **Properties** | **Description** |
| --- | --- |
| Read          | Allows access to read a file or folder. |
| Write         | Allows permission to edit a file or folder. |
| WriteContents | Allows permission to edit the content of folder. |
| Copy          | Allows permission to copy a file or folder. |
| Download      | Allows permission to download a file or folder. |
| Upload        | Allows permission to upload into the folder. |
| IsFile        | Specifies whether the rule is specified for folder or file. |
| Role          | Specifies the role to which the rule is applied. |
| Path          | Specifies the path to apply the rules which are defined. |

For Example
```sh
{
    "role": "Administator",
    "rules":[
        //Denies downloading the 'Videos' folder.
        {"path":"/Videos/", "isFile": false,"role": "Administator", "download": "deny"},
        //Denies uploading files in all folders under 'Pictures' by displaying a custom access denied message.
        {"path":"/Pictures/*","isFile": false, "role": "Administator","upload": "deny","message":"you don't have permission for this, Contact admisinistrator for access."  },
        //Denies deleting and renaming all files in 'Downloads' folder.
        {"path":"/Downloads/*.*","isFile":true, "role": "Administator","write": "deny", },
        //Denies opening all 'png' files in 'Employees' folder.
        {"path":"/Pictures/Employees/*.png","isFile":true, "role": "Administator","read": "deny" },
        //Denies downloading all files with name 'FileManager' in 'Documents' folder.
        {"path":"/Documents/FileManager.*","isFile":true, "role": "Administator", "download": "deny", "message":"you don't have permission for this, Contact admisinistrator for access."  },
    ]
}
```


## How to configure a web service

Follow the below set of commands to configure the nodeJS file system providers. 

- To install ej2-filemanager-node-filesystem package, use the following command.

```sh
 
  npm install @syncfusion/ej2-filemanager-node-filesystem

```

- To install the depend packages for the file system provider, navigate to @syncfusion/ej2-filemanager-node-filesystem folder within the node_modules and run the below command 

```sh
 
  npm install

```

* Now, run the below command line to check the Node API service in local and will be started in `http://localhost:8090/`. By default the nodeJS directory service is configured with `C:/Users`. 

### To configure the directory

* To change the directory use flag `-d` like this `-d D:/Projects`
 
### To configure the port

* To change the port use like this `set PORT=3000`

For example: 

```sh
set PORT=3000 && node filesystem-server.js -d D:/Projects
```

### start the service

To start the service use this command,

```sh
npm start
```

## File Manager AjaxSettings

To access the basic actions like Read, Delete, Copy, Move, Rename, Search, and Get Details of File Manager using NodeJS file system service, just map the following code snippet in the Ajaxsettings property of File Manager.

Here, the `hostUrl` will be your locally hosted port number.

```
  var hostUrl = http://localhost:8090/;
        ajaxSettings: {
            url: hostUrl,
        }
```

## File download AjaxSettings

To perform download operation, initialize the `downloadUrl` property in ajaxSettings of the File Manager component.

```
  var hostUrl = http://localhost:8090/;
  ajaxSettings: {
            url: hostUrl,
            downloadUrl: hostUrl + 'Download'
        },
```

## File upload AjaxSettings

To perform upload operation, initialize the `uploadUrl` property in ajaxSettings of the File Manager component.

```
  var hostUrl = http://localhost:8090/;
  ajaxSettings: {
            url: hostUrl,
            uploadUrl: hostUrl + 'Upload'
        },
```

## File image preview AjaxSettings

To perform image preview support in the File Manager component, initialize the `getImageUrl` property in ajaxSettings of the File Manager component.

```
  var hostUrl = http://localhost:8090/;
  ajaxSettings: {
            url: hostUrl,
            getImageUrl: hostUrl + 'GetImage'
        },
```

The FileManager will be rendered as follows.

![File Manager](https://ej2.syncfusion.com/products/images/file-manager/readme.gif)

## Support

Product support is available for through following mediums.

* Creating incident in Syncfusion [Direct-trac](https://www.syncfusion.com/support/directtrac/incidents?utm_source=npm&utm_campaign=filemanager) support system or [Community forum](https://www.syncfusion.com/forums/essential-js2?utm_source=npm&utm_campaign=filemanager).
* New [GitHub issue](https://github.com/syncfusion/ej2-javascript-ui-controls/issues/new).
* Ask your query in [Stack Overflow](https://stackoverflow.com/?utm_source=npm&utm_campaign=filemanager) with tag `syncfusion` and `ej2`.

## License

Check the license detail [here](https://github.com/syncfusion/ej2-javascript-ui-controls/blob/master/license).

## Changelog

Check the changelog [here](https://github.com/syncfusion/ej2-javascript-ui-controls/blob/master/controls/filemanager/CHANGELOG.md)

© Copyright 2020 Syncfusion, Inc. All Rights Reserved. The Syncfusion Essential Studio license and copyright applies to this distribution.
