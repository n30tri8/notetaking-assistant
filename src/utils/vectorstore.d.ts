declare module "./vectorstore.js" {
    export let vectorStore: any;

    export function initVectorStoreFromDocuments(docs: any): Promise<any>;

    export function loadVectorStore(): Promise<any>;

    export function enumerateAllSimilarityConnections(): Promise<any>;
}