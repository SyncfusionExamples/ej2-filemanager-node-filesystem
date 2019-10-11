# NodeJS file system providers for Essential JS 2 File Manager 

This repository contains the nodeJS file system provider used for Essential JS 2 File Manager component.

## Key Features

The Node.js file system provider module allows you to work with the physical file system. It also provides the methods for performing various file actions like creating a new folder, renaming files and deleting files.

NodeJs File System Provider Serves the file system providers support for the  FileManager component with the NodeJS.

The following actions can be performed with NodeJS file system provider.

| **Actions** | **Description** |
| --- | --- |
| Read      | Read the files from NodeJS file system. |
| Details   | Gets a file's details which consists of Type, Size, Location and Modified date. |
| Download  | Downloads the selected file or folder from NodeJS file system. |
| Upload    | Uploads a file in NodeJS file system. It accepts uploaded media with the following characteristics: <ul><li>Maximum file size:  30MB</li><li>Accepted Media MIME types: `*/*` </li></ul> |
| Create    | Creates a New folder. |
| Delete    | Deletes a folder or file. |
| Copy      | Copys the selected files or folders from target. |
| Move      | Moves the files or folders to the desired location. |
| Rename    | Renames a folder or file. |
| Search    | Full-text queries perform linguistic searches against text data in full-text indexes by operating on words and phrases. |


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

## Support

Product support is available for through following mediums.

* Creating incident in Syncfusion [Direct-trac](https://www.syncfusion.com/support/directtrac/incidents?utm_source=npm&utm_campaign=filemanager) support system or [Community forum](https://www.syncfusion.com/forums/essential-js2?utm_source=npm&utm_campaign=filemanager).
* New [GitHub issue](https://github.com/syncfusion/ej2-javascript-ui-controls/issues/new).
* Ask your query in [Stack Overflow](https://stackoverflow.com/?utm_source=npm&utm_campaign=filemanager) with tag `syncfusion` and `ej2`.

## License

Check the license detail [here](https://github.com/syncfusion/ej2-javascript-ui-controls/blob/master/license).

## Changelog

Check the changelog [here](https://github.com/syncfusion/ej2-javascript-ui-controls/blob/master/controls/filemanager/CHANGELOG.md)

© Copyright 2019 Syncfusion, Inc. All Rights Reserved. The Syncfusion Essential Studio license and copyright applies to this distribution.