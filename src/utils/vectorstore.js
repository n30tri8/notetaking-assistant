import {HNSWLib} from "@langchain/community/vectorstores/hnswlib";
import {embedding} from "./llm.js";
import path from "path";
import fs from "fs";
import {fileURLToPath} from "url";


export let vectorStore;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const vectorStoreDirectory = path.resolve(__dirname, "../../vectorstore");

// Ensure the directory exists
if (!fs.existsSync(vectorStoreDirectory)) {
    fs.mkdirSync(vectorStoreDirectory, {recursive: true});
}

export async function initVectorStoreFromDocuments(docs) {
    vectorStore = await HNSWLib.fromDocuments(
        docs,
        embedding
    );

    // Save the vector store to a directory
    try {
        // Save the vector store to a directory
        await vectorStore.save(vectorStoreDirectory);
    } catch (error) {
        console.error("Error saving vector store:", error);
    }

    return vectorStore
}


// Load the vector store from the same directory
export async function loadVectorStore() {
    vectorStore = await HNSWLib.load(
        vectorStoreDirectory,
        embedding
    );
    return vectorStore;
}

// we need to add one to the count because the first result is the document itself
const COUNT_SIMILAR_CONNECTIONS = 5 + 1;

function hashContent(content) {
    var hash = 0,
        i, chr;
    if (content.length === 0) return hash;
    for (i = 0; i < content.length; i++) {
        chr = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

function sanitizeUrlForFilename(url) {
    // Extract the domain and path from the URL
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/[\\/:*?"<>|]/g, '_');
    const path = urlObj.pathname.replace(/[\\/:*?"<>|]/g, '_');

    // Combine domain and path with underscores
    return `${domain}${path}`;
}

function createDocumentTitle(url, content) {
    const sanitizedUrl = sanitizeUrlForFilename(url);
    return sanitizedUrl + "-" + hashContent(content);
}

export async function enumerateAllSimilarityConnections() {
    let connectedDocuments = [];

    for (const doc_id of vectorStore._index.getIdsList()) {
        const doc_embedding = vectorStore._index.getPoint(doc_id);
        const results = await vectorStore.similaritySearchVectorWithScore(doc_embedding, COUNT_SIMILAR_CONNECTIONS);
        // Remove the first result, which is the document itself
        results.shift();

        const content = vectorStore.docstore._docs.get(doc_id.toString())["pageContent"]
        const title = createDocumentTitle(vectorStore.docstore._docs.get(doc_id.toString())["metadata"]["source"], content)
        connectedDocuments.push({
            "title": title,
            "content": content,
            "links": results.map(([id, score]) => {
                const similarDocContent = id["pageContent"];
                const similarDocTitle = createDocumentTitle(id["metadata"]["source"], similarDocContent)
                return similarDocTitle;
            })
        });
    }

    return connectedDocuments
}