const express = require("express");
const axios = require("axios");
var bodyParser = require("body-parser");
const { encode, decode } = require('gpt-3-encoder');
// 创建一个Express应用实例
const app = express();
// 定义端口号
// app.use(express.json());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
const PORT = 3001;
app.get("/", (req, res) => {
    res.send("欢迎来到Node.js Express应用！");
});

// 随机谷歌账户
// 传输一个 token 从 txt01 到 txt02
function isJsonString(str) {
    try {
        const parsed = JSON.parse(str);
        return typeof parsed === 'object' && parsed !== null;
    } catch (e) {
        return false;
    }
}
function getLastSystemContent(data) {
    let lastSystemMessage = null;
    for (let message of data.messages) {
        if (message.role === "system") {
            lastSystemMessage = message.content;
        }
    }
    return lastSystemMessage; // Returns the last system message, or null if none found
}
function getLastImageUrlOrBase64(messages) {
    let lastUrlOrBase64 = "";

    messages.forEach(message => {
        if (Array.isArray(message.content)) {
            message.content.forEach(item => {
                if (item.type === 'image_url' && item.image_url?.url) {
                    lastUrlOrBase64 = item.image_url.url;
                }
            });
        }
    });

    return lastUrlOrBase64;
}
const modelMap = {
    "gpt-4": "OPENAI_GPT4",
    "gpt-4-0613": "OPENAI_GPT4",
    "gpt-4-32k": "OPENAI_GPT4_32K",
    "gpt-4-128k": "OPENAI_GPT4_128K",
    "gpt-4-1106-preview": "OPENAI_GPT4_128K",
    "gpt-4-0125-preview": "OPENAI_GPT4_128K",
    "gpt-4-turbo-2024-04-09": "OPENAI_GPT4_128K",
    "gpt-4-turbo": "OPENAI_GPT4_128K",
    "gpt-4-turbo-preview": "OPENAI_GPT4_128K",
    "gpt-4-128k-latest": "OPENAI_GPT4_128K_LATEST",
    "gpt-4-vision-preview": "OPENAI_GPT4_VISION",
    "gpt-4o": "OPENAI_GPT4O",
    "gpt-4o-2024-05-13": "OPENAI_GPT4O",
    "gpt-3.5-turbo": "OPENAI_GPT3_5",
    "gpt-3.5-text": "OPENAI_GPT3_5_TEXT",
    "claude-3-5-sonnet-20240620": "CLAUDE_V3_5_SONNET",
    "claude-2.1": "CLAUDE_V2_1",
    "claude-3-opus-20240229": "CLAUDE_V3_OPUS",
    "claude-3-5-sonnet-20240620": "CLAUDE_V3_SONNET",
    "claude-3-haiku-20240307": "CLAUDE_V3_HAIKU",
    "gemini-1.5-pro": "GEMINI_1_5_PRO",
    "llama2-chat": "LLAMA2_CHAT",
    "llama3-large-chat": "LLAMA3_LARGE_CHAT",
    "groq-llama3-large-chat": "GROQ_LLAMA3_LARGE_CHAT",
    "palm": "PALM",
    "palm-text": "PALM_TEXT",
    "gemini-pro": "GEMINI_PRO",
    "mixtral-chat": "MIXTRAL_CHAT",
    "mistral-medium": "MISTRAL_MEDIUM",
    "abacus-giraffe": "ABACUS_GIRAFFE",
    "abacus-giraffe-large": "ABACUS_GIRAFFE_LARGE",
    "abacus-smaug3": "ABACUS_SMAUG3"
};

function getModelKey(key) {
    return modelMap[key] || null;
}
// 开始处理数据
app.post("/v1/chat/completions", async (req, res) => {
    let databody = req.body
    let index = 0
    databody.messages.forEach(element => {
        if (element && element != "" && element != undefined && !databody.model.includes("vision") && element.content != undefined) {
            index += encode(JSON.stringify(element.content)).length;
        }
    });
    let firstSystemContent = getLastSystemContent(databody);
    let systemcontent = " You are an artificial intelligence assistant. You only need to answer user questions, no need to precede the answer with assistant.";

    if (firstSystemContent != null) {
        systemcontent =
            "Please strictly follow your default identity to answer user questions. The identity you assume is: " +
            firstSystemContent;
    }
    let model = databody.model
    if (databody.model.includes("3.5")) {
        model = "gpt-3.5-turbo"
    }
    model = getModelKey(model)
    let authHeader = req.headers['authorization'];
    if (authHeader && authHeader.includes("Bearer")) {
        authHeader = authHeader.split("Bearer ")[1];
    }
    const transformedMessages = databody.messages.map(message => {
        if (message.role === "user") {
            return { "is_user": true, "text": message.content }
        } else if (message.role === "assistant") {
            return { "is_user": false, "text": message.content }

        } else {
            // 对于不是user或assistant的角色，这里我们选择跳过它们
            return null;
        }
    }).filter(message => message !== null);
    const options = {
        url: "https://api.abacus.ai/api/v0/getChatResponse?deploymentToken=76ec2da0160b453db326f5fcb6552d09&deploymentId=15f866f4a",
        method: "POST",
        headers: {
            Referer: "https://abacus.ai/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0"
        },
        data: {
            "llmName": model,
            "temperature": 0.5,
            "systemMessage": "You must be honest about who you are." + systemcontent,
            "messages": transformedMessages,
            "filterKeyValues": null,
            "searchScoreCutoff": null,
            "chatConfig": null
        },
        responseType: 'stream',
        timeout: 15000
    };
    let nonstr = ""
    let lastsre = ""
    let strall = ""
    axios(options)
        .then(response => {
            response.data.on('data', (chunk) => {
                let message = `${chunk.toString()}`
                lastsre += message
            });
            response.data.on('end', () => {
                if (isJsonString(lastsre)) {
                    let datalin = JSON.parse(lastsre)
                    if (datalin && datalin.result && datalin.result.messages) {
                        nonstr = datalin.result.messages[datalin.result.messages.length - 1].text
                    }
                }
                if (databody.stream == true) {
                    res.write(`data: {"id":"chatcmpl-9709rQdvMSIASrvcWGVsJMQouP2UV","object":"chat.completion.chunk","created":${Math.floor(Date.now() / 1000)},"model":"${databody.model}","system_fingerprint":"fp_3bc1b5746c","choices":[{"index":0,"delta":{"content":${JSON.stringify(nonstr)}},"logprobs":null,"finish_reason":null}]} \n\n`)
                }
                if (nonstr == "" || nonstr == null || nonstr == undefined) {
                    nonstr = "1"
                }
                if (!databody.stream || databody.stream != true) {
                    res.json({
                        id: "chatcmpl-8Tos2WZQfPdBaccpgMkasGxtQfJtq",
                        object: "chat.completion",
                        created: Math.floor(Date.now() / 1000),
                        model: databody.model,
                        choices: [
                            {
                                index: 0,
                                message: {
                                    role: "assistant",
                                    content: nonstr,
                                },
                                finish_reason: "stop",
                            },
                        ],
                        usage: {
                            prompt_tokens: index,
                            completion_tokens: encode(nonstr).length,
                            total_tokens: index + encode(nonstr).length,
                        },
                        system_fingerprint: null,
                    });
                    return;
                }
                res.write(
                    `data: {"id":"chatcmpl-89CvUKf0C36wUexKrTrmhf5tTEnEw","object":"chat.completion.chunk","model":"${databody.model}","created":${Math.floor(
                        Date.now() / 1000,
                    )},"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n`,
                );
                res.write(`data: [DONE]\n`);
                res.end();
            });
        })
        .catch(error => {
            // console.log(error)
            res.status(500).send("代理请求出错");
        });
});

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
