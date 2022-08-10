const { readFileSync, writeFileSync } = require("fs");

function main() {
    const content = JSON.parse(readFileSync("./manifest.json"));
    content.manifest_version = 2;
    content.permissions = content.host_permissions;
    delete content.host_permissions;
    writeFileSync("./manifest.json", JSON.stringify(content, null, 4));
}

main();
