import {Payload} from "../src/utils/momento-web";

class TranslationApi {
    async getTranslatedMessage(payload: Payload) {
        const url = `https://57zovcekn0.execute-api.us-west-2.amazonaws.com/prod/v1/translation`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        return response.json();
    }
}

export {TranslationApi};
