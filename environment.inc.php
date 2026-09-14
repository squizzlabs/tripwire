<?php

/**
 * Read selected values from a dotenv file without adding a Composer dependency.
 * Process environment values are resolved separately and always take precedence.
 */
function tripwireLoadDotenv($path, $allowedNames)
{
    if (!is_readable($path)) {
        return array();
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES);
    if ($lines === false) {
        throw new RuntimeException('Could not read environment file: ' . $path);
    }

    $allowed = array_fill_keys($allowedNames, true);
    $values = array();

    foreach ($lines as $index => $line) {
        if ($index === 0) {
            $line = preg_replace('/^\xEF\xBB\xBF/', '', $line);
        }

        $trimmed = trim($line);
        if ($trimmed === '' || substr($trimmed, 0, 1) === '#') {
            continue;
        }

        if (!preg_match('/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/', $line, $matches)) {
            continue;
        }

        $name = $matches[1];
        if (!isset($allowed[$name])) {
            continue;
        }

        $raw = trim($matches[2]);
        if ($raw === '') {
            $values[$name] = '';
            continue;
        }

        $quote = substr($raw, 0, 1);
        if ($quote === "'") {
            if (!preg_match("/^'((?:\\\\.|[^'\\\\])*)'(?:\\s+#.*)?$/", $raw, $quoted)) {
                throw new RuntimeException('Invalid single-quoted value for ' . $name . ' in ' . $path);
            }
            $values[$name] = preg_replace_callback(
                "/\\\\([\\\\'])/",
                function ($escape) {
                    return $escape[1];
                },
                $quoted[1]
            );
        } elseif ($quote === '"') {
            if (!preg_match('/^"((?:\\\\.|[^"\\\\])*)"(?:\s+#.*)?$/', $raw, $quoted)) {
                throw new RuntimeException('Invalid double-quoted value for ' . $name . ' in ' . $path);
            }
            $values[$name] = stripcslashes($quoted[1]);
        } else {
            $values[$name] = trim(preg_replace('/\s+#.*$/', '', $raw));
        }
    }

    return $values;
}

function tripwireEnvironmentValue($name, $dotenv, $default = null)
{
    $processValue = getenv($name);
    if ($processValue !== false) {
        return $processValue;
    }
    if (array_key_exists($name, $dotenv)) {
        return $dotenv[$name];
    }
    return $default;
}
