export function isMobile() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    // Check for common mobile device indicators in the user agent string
    const mobileIndicators = [
        "Android",
        "webOS",
        "iPhone",
        "iPad",
        "iPod",
        "BlackBerry",
        "Windows Phone",
        "Opera Mini",
        "IEMobile",
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
    dpad.style.left = "20%";
    dpad.style.transform = "translateX(-50%)";
    dpad.style.width = "240px";
    dpad.style.height = "240px";

    // Up button
    const up = document.createElement("button");
    up.textContent = "▲";
    up.style.fontSize = "24px";
    up.style.position = "absolute";
    up.style.left = "50%";
    up.style.top = "5%";
    up.style.width = "60px";
    up.style.height = "60px";
    up.style.background = "#272929";
    up.style.color = "#fff";
    up.style.borderRadius = "10%";
    up.style.userSelect = "none";
    up.onpointerdown = (e) => { e.preventDefault(); state.onKey({ key: "w" }, true); };
    up.onpointerup = () => state.onKey({ key: "w" }, false);
    up.onpointercancel = () => state.onKey({ key: "w" }, false);
    up.onpointerout = () => state.onKey({ key: "w" }, false);
    dpad.appendChild(up);

    // Down button
    const down = document.createElement("button");
    down.textContent = "▼";
    down.style.fontSize = "24px";
    down.style.position = "absolute";
    down.style.left = "50%";
    down.style.top = "55%";
    down.style.width = "60px";
    down.style.height = "60px";
    down.style.background = "#272929";
    down.style.color = "#fff";
    down.style.borderRadius = "10%";
    down.style.userSelect = "none";
    down.onpointerdown = (e) => { e.preventDefault(); state.onKey({ key: "s" }, true); };   
    down.onpointerup = () => state.onKey({ key: "s" }, false);
    down.onpointercancel = () => state.onKey({ key: "s" }, false);
    down.onpointerout = () => state.onKey({ key: "s" }, false);
    dpad.appendChild(down);

    // Left button
    const left = document.createElement("button");
    left.textContent = "◀";
    left.style.fontSize = "18px";
    left.style.position = "absolute";
    left.style.left = "25%";
    left.style.top = "30%";
    left.style.width = "60px";
    left.style.height = "60px";
    left.style.background = "#272929";
    left.style.color = "#fff";
    left.style.borderRadius = "10%";
    left.style.userSelect = "none";
    left.onpointerdown = (e) => { e.preventDefault(); state.onKey({ key: "a" }, true); };
    left.onpointerup = () => state.onKey({ key: "a" }, false);
    left.onpointercancel = () => state.onKey({ key: "a" }, false);
    left.onpointerout = () => state.onKey({ key: "a" }, false);
    dpad.appendChild(left);

    // Right button
    const right = document.createElement("button");
    right.textContent = "▶";
    right.style.fontSize = "18px";
    right.style.position = "absolute";
    right.style.left = "75%";
    right.style.top = "30%";
    right.style.width = "60px";
    right.style.height = "60px";
    right.style.background = "#272929";
    right.style.color = "#fff";
    right.style.borderRadius = "10%";
    right.style.userSelect = "none";
    right.onpointerdown = (e) => { e.preventDefault(); state.onKey({ key: "d" }, true); };
    right.onpointerup = () => state.onKey({ key: "d" }, false);
    right.onpointercancel = () => state.onKey({ key: "d" }, false);
    right.onpointerout = () => state.onKey({ key: "d" }, false);
    dpad.appendChild(right);

    document.body.appendChild(dpad);
}

export function addActionsButtonsToScreen(state) {
    const actionButtons = document.createElement("div");

    // Add A button
    const aButton = document.createElement("button");
    aButton.textContent = "A";
    aButton.style.position = "absolute";
    aButton.style.bottom = "28%";
    aButton.style.right = "10%";
    aButton.style.width = "70px";
    aButton.style.height = "70px";
    aButton.style.background = "#9a2257";
    aButton.style.color = "#fff";
    aButton.style.fontSize = "2em";
    aButton.style.userSelect = "none";
    aButton.style.borderRadius = "50%";
    aButton.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    aButton.onpointerdown = (e) => { e.preventDefault(); state.onKey({ key: "l" }, true); };
    aButton.onpointerup = () => state.onKey({ key: "l" }, false);
    aButton.onpointercancel = () => state.onKey({ key: "l" }, false);
    aButton.onpointerout = () => state.onKey({ key: "l" }, false);
    actionButtons.appendChild(aButton);

    // Add B button
    const bButton = document.createElement("button");
    bButton.textContent = "B";
    bButton.style.position = "absolute";
    bButton.style.bottom = "17%";
    bButton.style.right = "20%";
    bButton.style.width = "70px";
    bButton.style.height = "70px";
    bButton.style.background = "#9a2257";
    bButton.style.color = "#fff";
    bButton.style.fontSize = "2em";
    bButton.style.userSelect = "none";
    bButton.style.borderRadius = "50%";
    bButton.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    bButton.onpointerdown = (e) => { e.preventDefault(); state.onKey({ key: "j" }, true); };
    bButton.onpointerup = () => state.onKey({ key: "j" }, false);
    bButton.onpointercancel = () => state.onKey({ key: "j" }, false);
    bButton.onpointerout = () => state.onKey({ key: "j" }, false);
    actionButtons.appendChild(bButton);

    document.body.appendChild(actionButtons);
}
