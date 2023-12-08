"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const node_apk = require("node-apk");
const format = require("string-format");
const sourceJson = "../../extension.json";
const repositoryDir = "../../repository";
const extensionRepositoryDir = repositoryDir + "/extension";
const extensionIconDir = extensionRepositoryDir + "/icon";
const extensionJsonName = "extension.json";
var iconCount = 0;
const tmpDir = "./tmp";
const allReleaseApi = "https://api.github.com/repos/{user}/{repo}/releases";
const repoApi = "https://api.github.com/repos/{user}/{repo}";
const github = "github.com/";
let op = {
    headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.74 Safari/537.36"
    }
};
function parseApk(url, fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        const resp = yield fetch(url, op);
        const respBuffer = yield resp.arrayBuffer();
        const path = yield writeToFile(tmpDir + "/" + fileName, Buffer.from(respBuffer));
        const apk = new node_apk.Apk(path);
        const manifest = yield apk.getManifestInfo();
        const res = apk.getResources;
        const raw = manifest.raw;
        const features = raw.children["uses-feature"];
        if (features.length == 0) {
            return undefined;
        }
        const ff = features[0];
        const ffatt = ff["attributes"];
        if (ffatt.name != 'easybangumi.extension' || !ffatt.required) {
            return undefined;
        }
        const applications = raw.children["application"];
        if (applications.length == 0) {
            return undefined;
        }
        const application = applications[0];
        const metaData = application.children["meta-data"];
        const metaMap = new Map();
        metaData.forEach((meta) => {
            metaMap.set(meta.attributes.name, meta.attributes.value);
        });
        const resources = yield apk.getResources();
        const labelSource = manifest.applicationLabel;
        let label = "";
        if (typeof labelSource != "string") {
            const all = resources.resolve(labelSource);
            label = (all.find((res) => (res.locale && res.locale.language === "zh")) || all[0]).value;
        }
        else {
            label = labelSource;
        }
        const iconBytes = yield apk.extract(resources.resolve(manifest.applicationIcon)[0].value);
        const iconFileName = manifest.package + ".png";
        yield writeToFile(extensionIconDir + "/" + iconFileName, iconBytes);
        const info = {
            package: manifest.package,
            label: label,
            icon: iconFileName,
            versionName: manifest.versionName,
            versionCode: manifest.versionCode,
            mateData: metaMap,
        };
        apk.close();
        return info;
    });
}
function parseRepoInfo(publicItem) {
    return __awaiter(this, void 0, void 0, function* () {
        const releaseUrl = publicItem.release_url;
        const info = releaseUrl.substring(releaseUrl.indexOf(github) + github.length).split("/");
        const user = info[0], repo = info[1];
        const releaseApiUrl = format(allReleaseApi, { user: user, repo: repo });
        const releaseResp = yield fetch(releaseApiUrl, op);
        const releaseRespJson = yield releaseResp.json();
        const assetsUrl = releaseRespJson[0]["assets_url"];
        const assetsResp = yield fetch(assetsUrl, op);
        const assetsRespJson = yield assetsResp.json();
        const apkName = assetsRespJson[0]["name"];
        const downloadUrl = assetsRespJson[0]["browser_download_url"];
        // app 数据
        const apkInfo = yield parseApk(downloadUrl, apkName + ".apk");
        if (apkInfo == undefined) {
            return undefined;
        }
        const repoUrl = format(repoApi, { user: user, repo: repo });
        const repoResp = yield fetch(repoUrl, op);
        const repoRespJson = yield repoResp.json();
        // 仓库描述
        const desc = releaseRespJson["description"];
        const libApiVersion = apkInfo.mateData.get("easybangumi.extension.lib.version");
        if (libApiVersion == undefined) {
            return undefined;
        }
        const l = Number(libApiVersion);
        if (Number.isNaN(l)) {
            return undefined;
        }
        return {
            package: apkInfo.package,
            label: apkInfo.label,
            icon: apkInfo.icon,
            versionName: apkInfo.versionName,
            versionCode: apkInfo.versionCode,
            downloadUrl: downloadUrl,
            libApiVersion: l,
            desc: desc,
            author: user,
        };
    });
}
function mkdirs(path) {
    return new Promise((resolve, reject) => {
        fs.mkdir(path, () => {
            resolve();
        });
    });
}
function deleteFile(file) {
    return new Promise((resolve, reject) => {
        fs.rm(file, () => {
            resolve();
        });
    });
}
function writeToFile(file, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, data, () => {
            resolve(file);
        });
    });
}
function read(file) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, (err, data) => {
            resolve(data);
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield mkdirs(tmpDir);
        yield mkdirs(repositoryDir);
        yield mkdirs(extensionRepositoryDir);
        yield deleteFile(extensionIconDir);
        yield mkdirs(extensionIconDir);
        const data = yield read(sourceJson);
        if (!(data instanceof Buffer)) {
            console.log(data);
            console.log("source json error");
        }
        else {
            let json = data.toString();
            let plugins = JSON.parse(json)["plugins"];
            let res = [];
            for (let index = 0; index < plugins.length; index++) {
                const element = plugins[index];
                let count = 3;
                while (count > 0) {
                    try {
                        console.log(count + "parsing" + element);
                        const parse = yield parseRepoInfo({ release_url: element });
                        if (parse != undefined) {
                            res.push(parse);
                            break;
                        }
                    }
                    catch (e) {
                        console.log(e);
                    }
                    count--;
                    console.log(count + "parse error retry" + element);
                }
            }
            yield deleteFile(extensionRepositoryDir + "/" + extensionJsonName);
            yield writeToFile(extensionRepositoryDir + "/" + extensionJsonName, JSON.stringify(res));
        }
    });
}
main();
