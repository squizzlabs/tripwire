<?php

/**
 * Sanitize rich HTML stored in system notes.
 *
 * This is intentionally enforced on the server as well as in the browser.
 * Notes are shared stored content, and an older client must never be handed
 * executable markup merely because it predates the client-side sanitizer.
 */
function sanitizeNoteHtml($html) {
    if ($html === null || $html === '') {
        return '';
    }

    // Fail closed on installations missing the PHP DOM extension.
    if (!class_exists('DOMDocument')) {
        return htmlspecialchars((string)$html, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    $allowedTags = array_fill_keys([
        'b', 'i', 'em', 'strong', 'u', 's', 'strike', 'sub', 'sup',
        'font', 'span', 'p', 'br', 'hr', 'div', 'pre', 'blockquote',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tr', 'td', 'th',
        'a', 'img'
    ], true);
    $globalAttributes = array_fill_keys(['style', 'title', 'dir'], true);
    $tagAttributes = [
        'a' => array_fill_keys(['href', 'target', 'rel'], true),
        'font' => array_fill_keys(['color', 'size', 'face'], true),
        'td' => array_fill_keys(['colspan', 'rowspan'], true),
        'th' => array_fill_keys(['colspan', 'rowspan'], true),
        'img' => array_fill_keys(['src', 'alt', 'width', 'height'], true)
    ];
    $safeStyles = [
        'color' => '/^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([0-9.,%\s+-]+\)|[a-z]+)$/i',
        'background-color' => '/^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([0-9.,%\s+-]+\)|[a-z]+)$/i',
        'text-align' => '/^(?:left|right|center|justify|start|end)$/i',
        'font-weight' => '/^(?:normal|bold|bolder|lighter|[1-9]00)$/i',
        'font-style' => '/^(?:normal|italic|oblique)$/i',
        'text-decoration' => '/^(?:(?:none|underline|overline|line-through)\s*)+$/i'
    ];

    $document = new DOMDocument('1.0', 'UTF-8');
    $previousErrors = libxml_use_internal_errors(true);
    $loaded = $document->loadHTML(
        '<!doctype html><html><head><meta charset="utf-8"></head><body>' . (string)$html . '</body></html>',
        LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING
    );
    libxml_clear_errors();
    libxml_use_internal_errors($previousErrors);

    if (!$loaded) {
        return htmlspecialchars((string)$html, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    $body = $document->getElementsByTagName('body')->item(0);
    if (!$body) {
        return '';
    }

    $cleanNode = function ($node) use (&$cleanNode, $allowedTags, $globalAttributes, $tagAttributes, $safeStyles) {
        if ($node->nodeType === XML_COMMENT_NODE) {
            $node->parentNode->removeChild($node);
            return;
        }
        if ($node->nodeType !== XML_ELEMENT_NODE) {
            return;
        }

        // Descendants must be cleaned before a forbidden wrapper is removed;
        // otherwise newly promoted children never reach the attribute checks.
        foreach (iterator_to_array($node->childNodes) as $child) {
            $cleanNode($child);
        }

        $tag = strtolower($node->nodeName);
        if (!isset($allowedTags[$tag])) {
            $parent = $node->parentNode;
            while ($node->firstChild) {
                $parent->insertBefore($node->firstChild, $node);
            }
            $parent->removeChild($node);
            return;
        }

        $permitted = isset($tagAttributes[$tag]) ? $tagAttributes[$tag] : [];
        foreach (iterator_to_array($node->attributes) as $attribute) {
            $name = strtolower($attribute->nodeName);
            $value = $attribute->nodeValue;

            if (!isset($permitted[$name]) && !isset($globalAttributes[$name])) {
                $node->removeAttributeNode($attribute);
                continue;
            }

            if (($name === 'href' || $name === 'src') &&
                !preg_match('/^(?:https?:|mailto:|\/|#|\.{0,2}\/)/i', trim($value))) {
                $node->removeAttributeNode($attribute);
                continue;
            }

            if ($name === 'style') {
                $declarations = [];
                if (!preg_match(
                    '/(?:expression|javascript:|vbscript:|url\s*\(|@import|behaviou?r\s*:|-moz-binding)/i',
                    $value
                )) {
                    foreach (explode(';', $value) as $declaration) {
                        $parts = explode(':', $declaration, 2);
                        if (count($parts) !== 2) {
                            continue;
                        }
                        $property = strtolower(trim($parts[0]));
                        $propertyValue = trim($parts[1]);
                        if (isset($safeStyles[$property]) && preg_match($safeStyles[$property], $propertyValue)) {
                            $declarations[] = $property . ': ' . $propertyValue;
                        }
                    }
                }

                if ($declarations) {
                    $node->setAttribute('style', implode('; ', $declarations));
                } else {
                    $node->removeAttributeNode($attribute);
                }
            }
        }

        if ($tag === 'a' && $node->hasAttribute('target')) {
            $node->setAttribute('rel', 'noopener noreferrer');
        }
    };

    foreach (iterator_to_array($body->childNodes) as $child) {
        $cleanNode($child);
    }

    $result = '';
    foreach ($body->childNodes as $child) {
        $result .= $document->saveHTML($child);
    }
    return $result;
}
