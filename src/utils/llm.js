import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0
});

const embedding = new OpenAIEmbeddings();

export { llm, embedding };