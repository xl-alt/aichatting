const express = require("express");
var request = require("request");
const axios = require("axios");
var bodyParser = require("body-parser");
const { v4: uuidv4 } = require('uuid');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { encode, decode } = require('gpt-3-encoder');

// 创建一个Express应用实例
const app = express();
// 定义端口号
// app.use(express.json());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
const PORT = 3000;
app.get("/", (req, res) => {
    res.send("欢迎来到Node.js Express应用！");
});
function generateUuid() {
    return uuidv4();
}
// 随机谷歌账户
// 传输一个 token 从 txt01 到 txt02
async function transferToken() {
    const headers = {
    };
    // 定义请求的 URL
    const url = "http://47.113.179.88:3051/get-account"

    // 发送 GET 请求
    return await axios
        .get(url, {
            headers: headers, // 将自定义头部传递给请求
        })
        .then((response) => {
            // 请求成功处理
            return response.data
        })
        .catch((error) => {
            // 请求失败处理
            return -1
        });
}
function isJsonString(str) {
    try {
        const parsed = JSON.parse(str);
        return typeof parsed === 'object' && parsed !== null;
    } catch (e) {
        return false;
    }
}

// var user = "RIH81793940631997830"
// var password = "yrJVNxUOFtrv"
// var host = "dyn.horocn.com"
// var port = 50000

// var proxyUrl = "http://" + user + ":" + password + "@" + host + ":" + port;
// var proxiedRequest = request.defaults({'proxy': proxyUrl});

// proxiedRequest.get("https://httpbin.org/ip", function (error, response, body) {
//     console.log('Your public IP via proxy:', response);
// }

async function formatMessages(messages) {
    // 过滤掉 role 为 system 的消息
    const filteredMessages = messages.filter(
        (message) => message.role !== "system",
    );

    // 格式化剩余的消息
    const formattedMessages = filteredMessages.map(
        (message) => `${message.role}: ${message.content}`,
    );

    // 拼接所有消息
    return formattedMessages.join("\n");
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
// 开始处理数据
app.post("/v1/chat/completions", async (req, res) => {
    let databody = req.body
    let index = 0
    databody.messages.forEach(element => {
        if (element && element != "" && element != undefined && !databody.model.includes("vision")) {
            index += encode(JSON.stringify(element.content)).length;
        }
    });
    let question1 = await formatMessages(databody.messages);
    let firstSystemContent = getLastSystemContent(databody);
    let systemcontent = "";
    if (firstSystemContent != null) {
        systemcontent =
            "Please strictly follow your default identity to answer user questions. The identity you assume is: " +
            firstSystemContent;
    }
    let question = `system:You only need to answer user questions, no need to precede the answer with assistant.no search. ${systemcontent}  \n ${question1}`;
    const proxyUrl = 'http://ttBJnZAmxaCs6BO:bsDtTBWiEF8Kpe5@213.139.68.26:42465';
    // 创建HTTPS代理代理
    const proxyAgent = new HttpsProxyAgent(proxyUrl);
    const options = {
        url: "https://backend.aichattings.com/api/v2/chatgpt/talk",
        method: "POST",
        headers: {
            referer: "https://frontend.aichattings.com/?v=0.2",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        },
        agent: proxyAgent,
        json: {"msg":question,"model":"gpt3","locale":"en","ep_user_id":Math.floor(Math.random() * 50000) + 1, uuid:""}
    };
    // console.log(options)
    let tagsd = 0
    let strRes = ""
    let nonstr = ""
    let strRes_all = ""
    let strRes_all_last = ""
    // getPOST(formatted, token)
    const proxyReq = request(options);
    proxyReq.on("response", function (response) {
        response.on("data", (chunk) => {
            let message = `${chunk.toString()}`
            if (isJsonString(message) || message.includes("aichattings")) {
                return
            }

            nonstr += message
            if (databody.stream == true) {
                res.write(`data: {"id":"chatcmpl-9709rQdvMSIASrvcWGVsJMQouP2UV","object":"chat.completion.chunk","created":${Math.floor(Date.now() / 1000)},"model":"${databody.model}","system_fingerprint":"fp_3bc1b5746c","choices":[{"index":0,"delta":{"content":${JSON.stringify(message)}},"logprobs":null,"finish_reason":null}]} \n\n`)
            }


        });
        response.on("end", () => {
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
    });
    proxyReq.on("error", function (error) {
        // res.end()
        // 向客户端发送错误响应
        res.status(500).send("代理请求出错");
    });
});

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
