import fs from "fs";
import mustache from "mustache";
import {fileURLToPath} from "url";
import path from "path";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDirectory = path.resolve(__dirname, "../../output-graph");

let template;
try {
    template = fs.readFileSync(`${outputDirectory}/template.md`).toString()
} catch
    (error) {
    console.error("Error loading template file:", error);
}

// let documents = [
//     {title: "a", content: "This is new connet", links: ["a", "b", "c"]},
// ]
export async function createGraph(documents) {
    documents.forEach(doc => {
        let output = mustache.render(template, doc)
        fs.writeFileSync(`${outputDirectory}/output/${doc.title}.md`, output)
    });
}
