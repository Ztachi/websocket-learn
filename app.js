/*
 * @Author: 詹真琦(legendryztachi@gmail.com) 
 * @Date: 2018-04-24 14:39:36 
 * @Description: koa学习
 * @Last Modified by: 詹真琦(legendryztachi@gmail.com)
 * @Last Modified time: 2018-04-25 22:39:37
 */
const koa = require("koa");
const app = new koa();
const server = require('http').createServer(app.callback());
const fs = require("fs");
const path = require('path');
const route = require("koa-route"); //路由控制
const serve = require("koa-static"); //静态资源管理
const compose = require('koa-compose'); //中间件合成
const io = require('socket.io').listen(server);

const main = async ctx => {
    ctx.response.type = 'html';
    ctx.response.body = await fs.readFile('./index.html');
}

const redirect = ctx => { //重定向
    ctx.response.redirect('/');
}

const error = ctx => {
    ctx.throw(500);
}

const handler = async (ctx, next) => { //处理错误
    try {
        await next();
    } catch (err) {
        ctx.response.status = err.statusCode || err.status || 500;
        ctx.response.type = 'html';
        ctx.response.body = `<p>${ctx.response.status}, please contact administrator.</p>`;
        ctx.app.emit('error', err, ctx); //手动触发error事件
    }
};

app.use(serve(path.join(__dirname))); //统一静态资源路由

app.use((ctx, next) => {
    let count = ctx.cookies.get('count') || 0;
    console.log(++count);
    ctx.cookies.set('count', count);
    next();
})

app.use(compose([handler]));

app.use(route.get('/', main));
app.use(route.get('/redirect', redirect));
app.use(route.get('/error', error));


app.on('error', err => { //监听错误
    console.log('logging error ', err.message);
    console.log(err);
});

server.listen(3000, () => {
    console.log('start server listen 3000');
});

io.on('connection', socket => {
    socket.emit('open', '连接成功！路径/'); //通知客户端已连接

    let user = {
        name: false
    }

    // 对message事件的监听
    socket.on('message', msg => {
        let time = new Date();
        if (user.name) {
            io.sockets.emit('msg', `${time}-->${user.name}: ${msg}`); //对所有人发送
        } else {
            user.name = msg;
            socket.emit('msg', `${user.name},欢迎您登录`); //对自己发送
            socket.broadcast.emit('msg', `欢迎${user.name}加入聊天室`); //对除自己之外的人发送
        }

    });

    //监听出退事件
    socket.on('disconnect', () => {
        if (!user.name) return;
        socket.broadcast.emit('msg', `${user.name}已退出聊天室`);
    });

});

let user = 0;
const news = io.of('/news').on('connection', socket => { //监听/news路由
    let u = user++;
    socket.emit('open', `连接成功！${u}欢迎登陆`);

    socket.on('message', msg => {
        news.emit('msg_news', `${u}:${msg}`);
    });

    socket.on('disconnect', () => {
        socket.broadcast.emit('msg_news', `${u}已退出聊天室`);
    });
});