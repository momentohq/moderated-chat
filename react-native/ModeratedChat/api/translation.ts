import { type LanguageOption } from "../ChatApp";
import { type ChatMessageEvent, type User } from "../shared/models";

class TranslationApi {
  private readonly baseUrl =
    "https://chat-api.developer-mst-dev.preprod.a.momentohq.com";
  async createToken(
    user: User,
  ): Promise<{ token: string; expiresAtEpoch: number }> {
    const url = `${this.baseUrl}/v1/translate/token`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
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

  async getSupportedLanguages(): Promise<{
    supportedLanguages: LanguageOption[];
  }> {
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
