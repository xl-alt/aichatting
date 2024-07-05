const express = require("express");
var request = require("request");
var bodyParser = require("body-parser");
const { encode, decode } = require('gpt-3-encoder');
const axios = require("axios");

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

function getRandomInt(min, max) {
    // Math.random() 生成一个 [0, 1) 范围内的随机数
    // Math.floor() 向下取整
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 随机谷歌账户
function isJsonString(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

function findDifference(str1, str2) {
    // 检查第一个字符串是否是第二个字符串的一部分
    if (str2.startsWith(str1)) {
        // 如果是，返回第二个字符串的不同部分
        return str2.slice(str1.length);
    } else {
        // 如果不是，返回一个提示信息或者处理其他逻辑
        return "";
    }
}
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

// 开始post请求数据空间

function findDifference(str1, str2) {
    // 检查第一个字符串是否是第二个字符串的一部分
    if (str2.startsWith(str1)) {
        // 如果是，返回第二个字符串的不同部分
        return str2.slice(str1.length);
    } else {
        // 如果不是，返回一个提示信息或者处理其他逻辑
        return "";
    }
}
function generateRandomNumber() {
    // 生成一个随机数，范围在 0 到 1 之间
    let randomNumber = Math.random();

    // 将随机数转换为字符串，并保留16位小数
    let formattedNumber = randomNumber.toFixed(18).slice(2);

    // 返回格式化后的随机数
    return `0.${formattedNumber}`;
}

async function transferToken() {
    const headers = {
    };
    // 定义请求的 URL
    const url = "http://47.113.179.88:3111/get-account"

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
// 开始处理数据
app.post("/v1/chat/completions", async (req, res) => {
    let databody = req.body;
    let index = 0;
    let token = await transferToken();
    // token = token.trim();
    if (token == -1 || token.error) {
        token = await transferToken();
    }
    token = token.accountName
    databody.messages.forEach(element => {
        if (element && element != "" && element != undefined) {
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
    let question = `system: You need to answer user questions, no need to precede the answer with assistant. \n ${question1}`;
    let datatoken_get = token
    // 开始创建id
    const options = {
        url:
            "https://beta.theb.ai/api/conversation?org_id=" +
            datatoken_get.split("|")[1] +
            "&req_rand=" +
            generateRandomNumber(),
        method: "POST",
        headers: {
            // "Cookie":"__cf_bm=X_hzQIZFIOtRcCxwKO7.AUrS1HKCnVb5roLcfjKIFhc-1716785138-1.0.1.1-KaV6q63f0rFn.yTFEQJpdkO_7fsscGlYPld0rs4H_m0VcPfVku3UxZczKRgJbZGFKUmqUVRZB2eurh13pvidlw",
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
            "X-Ai-Model": "58f5e7e50fee4779a1e5fe16c3aa302b",
            Authorization: "Bearer " + datatoken_get.split("|")[0],
        },
        json: {
            text: question,
            model: "58f5e7e50fee4779a1e5fe16c3aa302b",
            functions: null,
            attachments: [],
            model_params: {
                system_prompt: systemcontent,
                temperature: "1",
                top_p: "1",
                frequency_penalty: "0",
                presence_penalty: "0",
                long_term_memory: "ltm",
            },
            topic_id: null,
            parent_id: null,
        },
    };
    let nonstr = "";
    let linstr = "";
    // getPOST(formatted, token)
    const proxyReq = request(options);
    proxyReq.on("response", function (response) {
        response.on("data", (chunk) => {
            let message = `${chunk.toString()}`;
            if (message.includes("theb")) {
                return
            }
            message = message.split(/data: |event: update/);
            message.forEach((item) => {
                if (
                    isJsonString(item) &&
                    JSON.parse(item).args &&
                    JSON.parse(item).args.content
                ) {
                    let jsonData = JSON.parse(item).args.content;
                    let sendstr = findDifference(linstr, jsonData);
                    linstr = jsonData;
                    nonstr += sendstr;
                    if (databody.stream == true) {
                        res.write(
                            `data: {"id":"chatcmpl-9709rQdvMSIASrvcWGVsJMQouP2UV","object":"chat.completion.chunk","created":${Math.floor(Date.now() / 1000)},"model":"${databody.model}","system_fingerprint":"fp_3bc1b5746c","choices":[{"index":0,"delta":{"content":${JSON.stringify(sendstr)}},"logprobs":null,"finish_reason":null}]} \n\n`,
                        );
                    }
                }
            });
        });
        response.on("end", () => {
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
                res.end();
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
        // 在这里打印错误日志
        // console.error("请求出错:", error);
        // res.end()
        // 向客户端发送错误响应
        res.status(500).send("代理请求出错");
    });
});

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
