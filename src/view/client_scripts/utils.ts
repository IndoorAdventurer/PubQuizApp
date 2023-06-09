// Some general code that might be needed by any type of client

/**
 * Given a socket, this function sets up all the infrastructure that is general
 * to any type of client (i.e. player, bigscreen, admin). After this function
 * has been called an `onmessage` event listener will be added to `socket` which
 * will:
 * * Correctly handle `{status: "failure"}` message and other types of errors
 * by showing them in a pop-up to the user;
 * * Correctly handle game state messages, by first possibly changing the active
 * page (template) and then emitting a message with with the received data to
 * that can be picked up by the script associated with that template;
 * * Correctly handle player_update messages. (These need a `player_update`
 * field in order to be recognized). These will emit a player_update event which
 * also contains the received data.
 * @param socket The socket to which the `onmessage` listener is added.
 */
export function socket_listener_setup(socket: WebSocket) {

    const main_div = document.getElementById("main");

    let old_msg: game_state_message = { widget_name: "-" };
    let new_msg: game_state_message = { widget_name: "-" };

    socket.onmessage = onMessage;

    // When the socket closes we simply wait 1 seconds and reload the page...
    socket.onclose = ev => setTimeout(() => location.reload(), 1_000);

    // Pingpong message every 10 second:
    let timer = setInterval(() => {
        if (socket.readyState === WebSocket.CLOSED) {
            clearInterval(timer);
            console.log("Closing pingpong!");
            return;
        }
        socket.send("🏓");
    }, 10_000); // change to 30 seconds later

    // Send a ping when, for example, screen just got unlocked again
    document.addEventListener("visibilitychange", ev => {
        if (document.visibilityState === "visible" &&
            socket.readyState !== WebSocket.CLOSED
        ) {
            socket.send("🏓");
        }
    });

    /**
     * Defines how to act when we receive a message
     * @param event The message event we received
     */
    function onMessage(event: MessageEvent) {
        try {
            // Pingpong messages: I sent 🏓, server sent 👌🏻 back.
            if (event.data === "👌🏻") {
                return;
            }

            const data = JSON.parse(event.data);

            // Check for a failure message first:
            if ("status" in data) {
                handleStatusMsg(data);
                return;
            }

            // Its a game state message, so calling its method:
            if ("widget_name" in data) {
                handleGameStateMessage(data);
                return;
            }

            // Player updates should be handled by specific handler:
            if ("player_update" in data) {
                const ev = new CustomEvent("player_update", { detail: data });
                document.dispatchEvent(ev);
                return;
            }

            throw new Error("Server doet raar...");

        } catch (e: any) {
            console.warn("Something went wrong with receiving a message.");
            console.warn(e);

            // Errors are shown as pop-up messages:
            if (e instanceof Error) {
                const error_div = document.createElement("div");
                error_div.className = "error_popup";
                error_div.textContent = e.message;
                main_div?.insertAdjacentElement("beforebegin", error_div);
                setTimeout(() => error_div.remove(), 15000);
            }
        }
    }

    /**
     * Handles a status message. If it has status failure, it throws. If not it
     * will emit a "server_status" event containing the message
     * @param data The received message from the server, which contains the
     * `status` keyword
     */
    function handleStatusMsg(data: { status: string, [key: string]: string }) {
        if (data.status === "failure") {
            const msg = "error_msg" in data ? data.error_msg : "Server error";
            throw new Error(msg);
        }
        const ev = new CustomEvent("server_status", { detail: data });
        document.dispatchEvent(ev);
    }

    /**
     * Subroutine of the above message handler that deals with game state
     * messages. First changs the current active page, if needed, and then sends
     * off an event containing all the received information and more, that has
     * the same name as the now active page, and as the `widget_name` field of
     * the received object
     * @param data The received message data
     */
    function handleGameStateMessage(data: game_state_message) {
        // Keep trach most recent and second-to-most recent messages. This
        // allows for comparisons, to see what needs to be changed.
        old_msg = new_msg;
        new_msg = data;

        const w_name = new_msg.widget_name;

        // If the active page (check with id) is not the one the message
        // is addressed to, change it to that page (=template)
        if (main_div && new_msg.widget_name !== main_div.className) {
            const template = document.getElementsByClassName(w_name)[0];
            // old_msg can only cause harm if we have moved to a new widget, so
            // resetting to default:
            old_msg = { widget_name: "-" };
            if (template) {
                main_div.className = template.className;
                main_div.innerHTML = template.innerHTML;
            }
            else {
                main_div.className = "none";
                main_div.innerHTML = "😴";
            }
        }

        // Emit an event that the relevant widget script can receive:
        const ev = new CustomEvent(w_name, {
            detail: {
                main_div: main_div,
                old_msg: old_msg,
                new_msg: new_msg
            }
        });
        document.dispatchEvent(ev);
    }
}

type game_state_message = {
    widget_name: string,
    [key: string]: any
}

/**
 * Adds a fullscreen toggle button in the top right corner of the screen and,
 * of course, makes sure that it works properly ;-)
 */
export function add_fullscreen_functionality() {

    // Add the button:
    const fs_btn = document.createElement("div");
    fs_btn.id = "fs_btn";
    document.body.appendChild(fs_btn);

    // Get the images:
    const enter_fs_img = new Image();
    enter_fs_img.src = "/img/enter_fs.svg";
    const exit_fs_img = new Image();
    exit_fs_img.src = "/img/exit_fs.svg";
    fs_btn.appendChild(enter_fs_img);
    
    // Toggle fullscreen:
    fs_btn.onclick = ev => {
        if (document.fullscreenElement)
            document.exitFullscreen();
        else
            document.documentElement.requestFullscreen();
    }

    // Change icon:
    document.addEventListener("fullscreenchange", ev => {
        fs_btn.innerHTML = "";
        if (document.fullscreenElement)
            fs_btn.appendChild(exit_fs_img);
        else
            fs_btn.appendChild(enter_fs_img);
    });
}

/**
 * If possible, this will add a wake lock, which prohobits the screen from going
 * black while this page is active. In addition, it will also set things up to
 * reacquire the lock after the user comes back to this screen again.
 */
export function add_wakelock_functionality() {
    if (!("wakeLock" in window.navigator)) {
        console.log("Wakelock not supported");
        return;
    }

    const nav = navigator as Navigator & { wakeLock: any };
    let lock: any = null;

    // Async funciton for getting lock:
    async function get_lock() {
        try {
            lock = await nav.wakeLock.request('screen');
        } catch (e) {
            console.log("Could not obtain WakeLock");
            console.log(e);
        }
    }

    // Reacquiring lock after user gets back to this screen:
    document.addEventListener("visibilitychange", ev => {
        if (document.visibilityState === "visible" && lock !== null)
            get_lock();
    });

    // Asking for lock :-)
    get_lock();
}