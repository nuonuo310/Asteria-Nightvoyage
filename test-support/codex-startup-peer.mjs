// Independent fictional peer: emit a short error, then remain open until the owner closes it.
process.stderr.write('\u001b[31mERROR\u001b[0m Codex could not find bubblewrap on PATH. Fictional diagnostic fixture.\n');
process.stdin.resume();process.stdin.on('end',()=>process.exit(0));
