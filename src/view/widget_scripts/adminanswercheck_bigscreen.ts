(function () {

    let idx = 0;

    const kut_teksten = [
        "Niet zomaar een man.. Een Goeman!",
        "Goemanspiratie: De Goemanische Woonkamerwedstrijd!",
        "Er zit een Goeman in ons allemaal!",
        "The Goeman Gotham deserves, but not the one it needs right now.",
    ];

    document.addEventListener("adminanswercheck", (ev: Event) => {
        const msg_old = (ev as CustomEvent).detail.old_msg;

        // We only do it one time:
        if (msg_old.widget_name === "adminanswercheck")
            return;

        const p = document.getElementById("logo_title");
        if (!p) return;

        // First going over them in order, afte that random:
        const choice = idx < kut_teksten.length ?
            idx++ : Math.floor(Math.random() * kut_teksten.length);

        // Setting the text to one of the kut teksten:
        p.textContent = kut_teksten[choice];

    });
})();