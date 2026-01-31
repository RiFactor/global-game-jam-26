
export function isMobile() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    // Check for common mobile device indicators in the user agent string
    const mobileIndicators = [
        "Android", "webOS", "iPhone", "iPad", "iPod", "BlackBerry", "Windows Phone", "Opera Mini", "IEMobile"
    ];
    for (const indicator of mobileIndicators) {
        if (ua.includes(indicator)) {
            return true;
        }
    }
    return false;
}

export function addDpadToScreen(state) {
    const dpad = document.createElement("div");
    dpad.id = "dpad";
    dpad.style.position = "absolute";
    dpad.style.top = "60%";
    dpad.style.left = "20%"
    dpad.style.transform = "translateX(-50%)";
    dpad.style.width = "240px";
    dpad.style.height = "240px";

    // Up button
    const up = document.createElement("button");
    up.textContent = "▲";
    up.style.position = "absolute";
    up.style.left = "50%";
    up.style.top = "0px";
    up.style.width = "70px";
    up.style.height = "70px";
    up.onpointerdown = () => state.onKey({ key: "w" }, true);
    up.onpointerup = () => state.onKey({ key: "w" }, false);
    dpad.appendChild(up);

    // Down button
    const down = document.createElement("button");
    down.textContent = "▼";
    down.style.position = "absolute";
    down.style.left = "50%";
    down.style.top = "60%";
    down.style.width = "70px";
    down.style.height = "70px";
    down.onpointerdown = () => state.onKey({ key: "s" }, true);
    down.onpointerup = () => state.onKey({ key: "s" }, false);
    dpad.appendChild(down);

    // Left button
    const left = document.createElement("button");
    left.textContent = "◀";
    left.style.position = "absolute";
    left.style.left = "20%";
    left.style.top = "30%";
    left.style.width = "70px";
    left.style.height = "70px";
    left.onpointerdown = () => state.onKey({ key: "a" }, true);
    left.onpointerup = () => state.onKey({ key: "a" }, false);
    dpad.appendChild(left);

    // Right button
    const right = document.createElement("button");
    right.textContent = "▶";
    right.style.position = "absolute";
    right.style.left = "80%";
    right.style.top = "30%";
    right.style.width = "70px";
    right.style.height = "70px";
    right.onpointerdown = () => state.onKey({ key: "d" }, true);
    right.onpointerup = () => state.onKey({ key: "d" }, false);
    dpad.appendChild(right);

    document.body.appendChild(dpad);
}

export function addActionsButtonsToScreen(state) {

// a button 
    const actionButtons = document.createElement("div");

    // a button
    const aButton = document.createElement("button");
    aButton.id = "a-button";
    aButton.textContent = "A";
    aButton.style.position = "absolute";
    aButton.style.bottom = "28%";
    aButton.style.right = "10%";
    aButton.style.width = "80px";
    aButton.style.height = "80px";
    
    // aButton.onpointerdown = () => {
    //     console.log("A button pressed");
    //     // Implement A button functionality here
    // };
    document.body.appendChild(aButton);

    // b button
    const bButton = document.createElement("button");
    bButton.id = "b-button";
    bButton.textContent = "B";
    bButton.style.position = "absolute";
    bButton.style.bottom = "15%";
    bButton.style.right = "20%";
    bButton.style.width = "80px";
    bButton.style.height = "80px";
    
    // bButton.onpointerdown = () => {
    //     console.log("B button pressed");
    //     // Implement B button functionality here
    // };
    document.body.appendChild(bButton);

    document.body.appendChild(actionButtons);
}

