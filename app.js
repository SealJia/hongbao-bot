const {Wechaty, Room, Contact} = require('wechaty')
const { getUrl, isIncludeUrl} = require("./utils")
const axios = require("axios")

const bot = Wechaty.instance({profile: 'Promise'}) //‘Promise’为微信名， 避免每次启动程序重新扫码
let urls = []   //红包链接

bot
.on('scan', (url, code)=>{
    console.log(url)
    let loginUrl = url.replace('qrcode', 'l')
    require('qrcode-terminal').generate(loginUrl)
})

.on('login', user=>{
    console.log(`${user} login`)
})
.on('friend', async (contact, request) => {
  const fileHelper = Contact.load('filehelper')

  try {
    if (request) {
      /**
       * 1. New Friend Request
       */
      // if (request.hello === '红包') {
        await request.accept()
        console.log(contact.name())
        // await contact.say("直接转发红包到此微信号,按提示填写手机号领取最大红包\n 项目地址：https://github.com/dj940212/hongbao-bot")
      // }
    } else {
      await contact.say("转发外卖红包到此微信号,提示后发送手机号")
    }
  } catch (e) {
    console.log(e.message)
  }

})
.on('message', async m => {
    /**
     * [发送到文件助手或者发送给微信号]
     */
    if (m.room()) { return }
    if (m.to().name() !== "File Transfer" && !m.to().self()) { return }

    // 文件助手
    const filehelper = await Contact.load('filehelper')
    /**
     * [检查链接]
     */
    if( isIncludeUrl(m.content()) ){
        const url = getUrl(m.content())
        urls.push(url)
        console.log("剩余红包数", urls.length)

        //发送到机器人
        if (m.to().self()) {
            await m.from().say("输入框发送手机号码领取")
        }

        //发送到文件助手
        if (m.to().name() === "File Transfer") {
            await filehelper.say("输入框发送手机号码领取")
        }

    }

    //检查手机号码
    if (/^[1][3,4,5,7,8][0-9]{9}$/i.test(m.content())) {
        const mobile = m.content()

        if (!urls.length) {
            //发送到微信
            if (m.to().self()) {
                await m.from().say("需要转发外卖红包")
            }

            //发送到文件助手
            if (m.to().name() === "File Transfer") {
                await filehelper.say("需要转发外卖红包")
            }

            return
        }

        console.log(urls[urls.length - 1], mobile)

        let res = {}
        try {
            res = await axios.post('http://101.132.113.122:3007/hongbao', {url: urls[urls.length - 1], mobile})
            urls.pop()
        } catch (e) {
            console.log(e)
        }

        //发送到微信
        if (m.to().self()) {
            await m.from().say(res.data.message)
            await m.from().say("如果帮助到你,发个红包吧^_^")
        }

        //发送到文件助手
        if (m.to().name() === "File Transfer") {
            await filehelper.say(res.data.message)
            await m.from().say("如果帮助到你,发个红包吧^_^")
        }
    }
})
.start()
