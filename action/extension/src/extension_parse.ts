import { ExecException } from 'child_process';
import fs = require('fs');
import node_apk = require('node-apk');
import XmlElement from 'node-apk/build/lib/xml';
import { type } from 'os';
import { buffer } from 'stream/consumers';
import format = require('string-format');

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

// apk 文件解析信息封装
type ApkInfo = {
    package: string,
    label: string,
    icon: string,
    versionName: string,
    versionCode: number,
    mateData: Map<string, string>,
};


type ExtensionItem = {
    package: string,
    label: string,
    icon: string,
    versionName: string,
    versionCode: number,
    downloadUrl: string,
    libApiVersion: number,
    desc: string,
    author: string,
};

type ExtensionPushItem = {
    release_url: string,
};

async function parseApk(url: string, fileName: string): Promise<ApkInfo | undefined> {
    const resp = await fetch(url, op);
    const respBuffer = await resp.arrayBuffer();
    const path = await writeToFile(tmpDir + "/" + fileName, Buffer.from(respBuffer));

    const apk = new node_apk.Apk(path);
    const manifest = await apk.getManifestInfo();
    const res = apk.getResources
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
    const metaMap = new Map<string, string>();
    metaData.forEach((meta) => {
        metaMap.set(meta.attributes.name, meta.attributes.value)
    })

    const resources = await apk.getResources()
    const labelSource = manifest.applicationLabel
    let label: string = ""
    if (typeof labelSource != "string") {
        const all = resources.resolve(labelSource);
        label = (all.find((res) => (res.locale && res.locale.language === "zh")) || all[0]).value;
    } else {
        label = labelSource
    }

    const iconBytes = await apk.extract(resources.resolve(manifest.applicationIcon)[0].value)
    const iconFileName = manifest.package + ".png";

    await writeToFile(extensionIconDir + "/" + iconFileName, iconBytes)

    const info = {
        package: manifest.package,
        label: label,
        icon: iconFileName,
        versionName: manifest.versionName,
        versionCode: manifest.versionCode,
        mateData: metaMap,
    }

    apk.close();
    return info;
}

async function parseRepoInfo(publicItem: ExtensionPushItem): Promise<ExtensionItem | undefined> {

    const releaseUrl = publicItem.release_url;

    const info = releaseUrl.substring(releaseUrl.indexOf(github) + github.length).split("/");
    const user = info[0], repo = info[1];

    const releaseApiUrl = format(allReleaseApi, { user: user, repo: repo });

    const releaseResp = await fetch(releaseApiUrl, op);
    const releaseRespJson = await releaseResp.json();

    const assetsUrl = releaseRespJson[0]["assets_url"];
    const assetsResp = await fetch(assetsUrl, op);
    const assetsRespJson = await assetsResp.json();

    const apkName = assetsRespJson[0]["name"];
    const downloadUrl = assetsRespJson[0]["browser_download_url"];
   

    // app 数据
    const apkInfo = await parseApk(downloadUrl, apkName + ".apk");

    if (apkInfo == undefined) {
        return undefined;
    }


    const repoUrl = format(repoApi, { user: user, repo: repo });
    const repoResp = await fetch(repoUrl, op);
    const repoRespJson = await repoResp.json();

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
    }
}


function mkdirs(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.mkdir(path, () => {
            resolve();
        })
    });
}

function deleteFile(file: string): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.rm(file, () => {
            resolve()
        })
    });
}
function writeToFile(file: string, data: Buffer|string): Promise<string> {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, data, () => {
            resolve(file);
        })
    });
}

function read(file: string): Promise<Buffer | NodeJS.ErrnoException | null> {
    return new Promise((resolve, reject) => {
        fs.readFile(file, (err, data) => {
            resolve(data)
        })
    });
}



async function main() {
    await mkdirs(tmpDir);
    await mkdirs(repositoryDir)
    await mkdirs(extensionRepositoryDir);
    await deleteFile(extensionIconDir);
    await mkdirs(extensionIconDir);

    const data = await read(sourceJson);

    if (!(data instanceof Buffer)) {
        console.log(data)
        console.log("source json error")
    } else {
        let json = data.toString();
        let plugins = JSON.parse(json)["plugins"];
        let res: ExtensionItem[] = [];
        for (let index = 0; index < plugins.length; index++) {
            const element = plugins[index];
            let count = 3;
            while (count > 0) {
                try {
                    console.log(count + "parsing" + element)
                    const parse = await parseRepoInfo({ release_url: element });
                    if(parse != undefined){
                        res.push(parse);
                        break;
                    }
                    
                } catch (e) {
                    console.log(e);
                }
                count--;
                console.log(count + "parse error retry" + element)
            }
        }
        await deleteFile(extensionRepositoryDir + "/" + extensionJsonName);
        await writeToFile(extensionRepositoryDir + "/" + extensionJsonName,   JSON.stringify(res));
      
    }
}

main();