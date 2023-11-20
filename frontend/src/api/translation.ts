import { type ChatMessageEvent } from "../utils/momento-web";

class TranslationApi {
  private readonly baseUrl =
    "https://57zovcekn0.execute-api.us-west-2.amazonaws.com/prod";
  async getToken(
    username: string,
  ): Promise<{ token: string; expiresAtEpoch: number }> {
    const url = `${this.baseUrl}/v1/translate/token/${username}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.json();
  }

  async getLatestChats(
    lang: string,
  ): Promise<{ messages: ChatMessageEvent[] }> {
    const url = `${this.baseUrl}/v1/translate/latestMessages/${lang}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.json();
  }

  async getSupportedLanguages(): Promise<{ supportedLanguages: string[] }> {
    const url = `${this.baseUrl}/v1/translate/languages`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.json();
  }
}

export default new TranslationApi();
