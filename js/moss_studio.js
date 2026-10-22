import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

app.registerExtension({
  name: "MOSS.Studio",
  commands: [{
    id: "MOSS.OpenStudio",
    label: "Open MOSS Studio",
    function: () => window.open(api.apiURL("/moss-studio"), "_blank", "noopener")
  }],
  menuCommands: [{ path: ["Extensions"], commands: ["MOSS.OpenStudio"] }]
});
