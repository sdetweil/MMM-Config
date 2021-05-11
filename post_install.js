const fs = require("fs");

fs.copyFile(".pre-commit", ".git/hooks/pre-commit", (err) => {
  if (err) {
    console.log("error=" + err);
  }
});
