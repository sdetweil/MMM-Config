const { spawnSync } = require("child_process");

const helpstring =
  " arguments expected otherplatform_script_name[: windows_script_name]\n  colon and windows_script_name is optional";

let cmd = "";

if (process.argv[2]) {
  switch (process.argv[2]) {
    case "-?":
    case "--help":
    case "-help":
    case "help":
      console.log(helpstring);
      return;
      break;
    default:
  }

  let shell_command;

  let cmd = process.argv[2];

  if (cmd.includes(":")) {
    shell_command = cmd.split(":");

    switch (process.platform) {
      case "win32":
        cmd = shell_command[1];
        break;
      default:
        cmd = shell_command[0];
        break;
    }
  }

  let command_output = spawnSync(cmd, { shell: true });

  if (command_output.stderr) console.log(command_output.stderr.toString());
  if (command_output.stdout) console.log(command_output.stdout.toString());
} else {
  console.log(helpstring);
}
