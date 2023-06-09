import * as http from 'http';
import * as https from 'https';
import express, { Express } from 'express';
import * as ws from 'ws';
import yesOrThrow from '../utils/yesorthrow.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';

/**
 * This class encapsulates both the `express` server as well as the `ws`
 * websocket server. `ServerListener` objects will be able to subscribe to
 * specific messages, such that the server forwards these to them.
 * 
 * Pretty much all server responses etc are handled by `ServerListener` (see
 * description of this interface below).
 */
export default class Server {

    private port: number;
    
    // server constituents:
    private http_server: http.Server | https.Server;
    private express: Express;
    private wss: ws.WebSocketServer;

    // A lookup table associating routes with subscribed listeners:
    private routeMap: Map<string, ServerListener>;


    /**
     * Constructor. Sets up the infrastructure for servering clients.
     * @param config The configuration object containing all settings.
     */
    constructor(config: { [key: string]: any }) {

        this.port = yesOrThrow(config, "port");

        this.express = express();

        // Create https or http server:
        if ("key_file" in config && "cert_file" in config) {
            this.http_server = https.createServer({
                key: readFileSync(config.key_file),
                cert: readFileSync(config.cert_file)
            }, this.express);
        }
        else
            this.http_server = http.createServer(this.express);
        
        this.wss = new ws.WebSocketServer({ server: this.http_server });

        // static files should go here!
        this.express.use(express.static("static"));

        // folder containing the config json file should also contain a file
        // called "resources" in which all images, videos, etc are found.
        // these can then be accessed via the "/resources/*" route.
        const resources_dir = join(dirname(config.config_path), "resources");
        this.express.use("/resources", express.static(resources_dir));
        
        this.routeMap = new Map<string, ServerListener>();

        this.wss.on("connection", (socket: ws.WebSocket) => {
            const route = socket.protocol;

            const route_val = this.routeMap.get(route);
            if (route_val) {
                Server.makePingable(socket);
                route_val.add_websocket(socket);
                return;
            }

            // No valid route, so closing:
            socket.close(1003, `Please specify 1 valid protocol. "${route}" is invalid.`);
        })
    }

    /**
     * Allows a server listener to be added to the server. After this is done:
     * * HTTP GET requests with route `route` will invoke the `express_get()`
     * method of `listener`;
     * * New websocket connections with `route` as `protocol` attribute
     * (minus '/') will invoke the `add_websocket()` method of `listener`. This
     * method takes the socket as argument, meaning that `listener` has full
     * control over it. **IMPORTANT:** it should definitely set `socket.onclose`.
     * And possibly also `socket.onmessage`.
     * @param route The route to subscribe to. Should always start with a forward
     * slash, followed by a valid path string, so "/x", where 'x' is any string.
     * After that, "x.com/x" will redirect to the `ServerListener.express_get()`
     * method, and specifying "x" as protocol will call
     * `ServerListener.add_websocket()` with that websocket.
     * @param listener The listener to add as subscriber.
     */
    public addServerListener(route: Route, listener: ServerListener): void {
        if (this.routeMap.has(route)) {
            console.warn(`The route "${route}" was already added. Ignoring.`);
            return;
        }

        // Apparently protocols cannot start with '/', so taking substring.
        this.routeMap.set(route.substring(1), listener);

        this.express.get(route, (req, res) => {
            listener.express_get(req, res);
        })
    }

    /**
     * Add a redirect to the default ("/") route.
     * @param route The route to redirect the player to
     */
    public setDefaultRoute(route: `/${string}`) {
        this.express.get("/", (req, res) => {
            res.redirect(route);
        })
    }

    /**
     * Makes the server listen. Function does not ever return, so should be
     * called last, of course :-p
     */
    public listen(): void {
        this.http_server.listen(this.port);
    }

    /**
     * All sockets should return 👌🏻 when they receive 🏓 from a client. These
     * are ping pong messages to keep the socket active. This function turns
     * an existing socket into one that has this behavior. Even after you set
     * the onmessage property to another function.
     * @param socket The existing socket to modify
     */
    private static makePingable(socket: ws.WebSocket) {
        // Setting a default listener that returns 🏓 for every msg:
        socket.addEventListener("message", ev => ev.target.send("👌🏻"));
        
        // Overwriting the `onmessage` property with one that puts some pingpong
        // middleware inbetween, which sends 👌🏻 when 🏓 was received.
        // And otherwise standard behavior
        Object.defineProperty(socket, "onmessage", {
            enumerable: true,
            get() {
                return Object.getPrototypeOf(this).onmessage;
            },
            set(handler) {
                this.removeAllListeners("message");
                this.addEventListener("message", (event: ws.MessageEvent) => {
                    if (event.data === "🏓")
                        event.target.send("👌🏻");
                    else
                        handler(event);
                });
            }
        });
    }
}

// Route should always start with a forward slash:
type Route = `/${string}`;

/**
 * An interface that should be implemented by any class/object that wants to
 * be able to interact with the `Server` object.
 */
export interface ServerListener {

    /**
     * A method that gets invoked by `Server` whenever it receives a GET
     * request with as route that this listener is subscribed to
     * @param req The `Request` object gotten from the `express.get()` callback.
     * @param res The `Response` object gotten from the `express.get()` callback.
     * This object can be used to send a reply, with res.send();
     */
    express_get(req: express.Request, res: express.Response): void;

    /**
     * A method that gets called whenever a new socket connects to the server
     * that has as `Socket.protocol` attribute the specific `route` this
     * listener subscribed itself to in the
     * `Server.addServerListener(route, ...)` method.
     * @param socket The newly connected socket. The listener is responsible for:
     * * Keeping a data structure containing all the added sockets;
     * * Setting an on-closed listener to this socket (`socket.onclose`)
     * that makes sure the socket is removed properly from the listener;
     * * Setting a callback response (`socket.onmessage`) that gets
     * called whenever the socket sends a message. This last step is not always
     * needed.
     */
    add_websocket(socket: ws.WebSocket): void;

}