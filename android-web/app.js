const welcome = document.querySelector("#welcome");
const chat = document.querySelector("#chat");

function show(screen) {
  welcome.classList.toggle("active", screen === "welcome");
  chat.classList.toggle("active", screen === "chat");
}

document.querySelector("#start-chat").addEventListener("click", () => show("chat"));
document.querySelector("#back").addEventListener("click", () => show("welcome"));