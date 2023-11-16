class TranslationApi {
  async getToken(username: string): Promise<{ token: string, expiresAtEpoch: number }> {
    const url = `https://57zovcekn0.execute-api.us-west-2.amazonaws.com/prod/v1/translation/token/${username}`;
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
