import "cheerio";
import {CheerioWebBaseLoader} from "@langchain/community/document_loaders/web/cheerio";
import {RecursiveCharacterTextSplitter} from "langchain/text_splitter";
import {enumerateAllSimilarityConnections, initVectorStoreFromDocuments} from "./utils/vectorstore.js";
import {createGraph} from "./utils/graph-creator.js";

const loader = new CheerioWebBaseLoader(
    "https://lilianweng.github.io/posts/2023-06-23-agent/"
);

const docs = await loader.load();

const textSplitter = new RecursiveCharacterTextSplitter({
    // chunkSize: 1000,
    // chunkOverlap: 200,
    chunkSize: 400,
    chunkOverlap: 10,
});
const documents = (await textSplitter.splitDocuments(docs)).slice(0, 30);
// const splits = await textSplitter.splitDocuments(docs);
const vectorStore = await initVectorStoreFromDocuments(documents);

let connectedDocuments = await enumerateAllSimilarityConnections()
await createGraph(connectedDocuments);