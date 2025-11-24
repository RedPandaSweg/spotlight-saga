Hooks.once('ready', () => {
  // Check if Dice So Nice is installed and active
  const dsnModule = game.modules.get("dice-so-nice");
  if (!dsnModule || !dsnModule.active) return;

  // Safe to use the diceSoNiceReady hook
  Hooks.once('diceSoNiceReady', (dice3d) => {
    console.log("Dice So Nice is ready, adding my presets…");

    dice3d.addSystem({ id: "spotlight-saga", name: "Spotlight Saga" }, true);

    dice3d.addDicePreset({
      type: "d4",
      labels: ["--", "-", "+", "++"],
      system: "spotlight-saga",
    });
    // dice3d.addDicePreset({
    //   type: "d6",
    //   labels: ["-", "-", " ", " ", "+", "+"],
    //   system: "spotlight-saga",
    // });
  });
});