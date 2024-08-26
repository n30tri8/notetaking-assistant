import "cheerio";
import {CheerioWebBaseLoader} from "@langchain/community/document_loaders/web/cheerio";
import {RecursiveCharacterTextSplitter} from "langchain/text_splitter";
import {enumerateAllSimilarityConnections, initVectorStoreFromDocuments} from "./utils/vectorstore.js";
import {createGraph} from "./utils/graph-creator.js";

const urls = [
    "https://lilianweng.github.io/posts/2023-06-23-agent/",
    "https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/",
    "https://lilianweng.github.io/posts/2023-10-25-adv-attack-llm/",
];

const docs = await Promise.all(
    urls.map((url) => new CheerioWebBaseLoader(url).load()),
);
const unprocessedDocument = docs.flat();

const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
});
const documents = await textSplitter.splitDocuments(unprocessedDocument);
const vectorStore = await initVectorStoreFromDocuments(documents);

let connectedDocuments = await enumerateAllSimilarityConnections();
await createGraph(connectedDocuments);