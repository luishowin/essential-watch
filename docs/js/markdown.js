/* Essential Watch, minimal markdown renderer.
   Plain JS, no dependencies, in keeping with the rest of the project.

   Covers exactly the subset hardware-spec.md uses, plus a little headroom:
   ATX headings, nested bullets, ordered lists, rules, paragraphs, and the
   inline set (bold, italic, code, links). It is not a CommonMark parser and
   does not try to be. If the spec ever grows a table or a fenced code block,
   this file is where that goes.

   Exposes window.renderMarkdown(src) -> html string. */

(function (global) {
  "use strict";

  /* The section whose ordered list gets stable oi-N anchors, so a single
     pending decision can be linked directly (spec.html#oi-12). */
  var OPEN_ITEMS_SLUG = "open-items-pending-decisions";

  function escapeHtml(t) {
    return t
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function slug(raw) {
    return raw
      .toLowerCase()
      .replace(/[*`_]/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function inline(t) {
    return escapeHtml(t)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  }

  function renderMarkdown(src) {
    var lines = String(src).replace(/\r\n?/g, "\n").split("\n");
    var out = [];
    var para = [];
    var stack = [];     /* open list tags, outermost first */
    var liOpen = [];    /* parallel: is an <li> open at that depth */
    var inOpenItems = false;

    function flushPara() {
      if (!para.length) return;
      out.push("<p>" + inline(para.join(" ")) + "</p>");
      para = [];
    }

    function closeItem() {
      var i = liOpen.length - 1;
      if (i >= 0 && liOpen[i]) {
        out.push("</li>");
        liOpen[i] = false;
      }
    }

    function popList() {
      closeItem();
      out.push("</" + stack.pop() + ">");
      liOpen.pop();
    }

    function closeLists() {
      while (stack.length) popList();
    }

    function openList(tag) {
      out.push("<" + tag + ">");
      stack.push(tag);
      liOpen.push(false);
    }

    function item(depth, tag, text, id) {
      flushPara();

      while (stack.length > depth + 1) popList();

      if (stack.length === depth + 1) {
        closeItem();
        if (stack[stack.length - 1] !== tag) {
          popList();
          openList(tag);
        }
      } else {
        while (stack.length < depth + 1) openList(tag);
      }

      out.push("<li" + (id ? ' id="' + id + '"' : "") + ">" + inline(text));
      liOpen[liOpen.length - 1] = true;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      if (!line.trim()) {
        flushPara();
        closeLists();
        continue;
      }

      var heading = /^(#{1,3})\s+(.*)$/.exec(line);
      if (heading) {
        flushPara();
        closeLists();
        var level = heading[1].length;
        var id = slug(heading[2]);
        inOpenItems = level <= 2 && id === OPEN_ITEMS_SLUG;
        out.push(
          "<h" + level + ' id="' + id + '">' + inline(heading[2]) +
          ' <a class="md-anchor" href="#' + id + '" aria-label="Link to this section">#</a>' +
          "</h" + level + ">"
        );
        continue;
      }

      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        flushPara();
        closeLists();
        out.push("<hr>");
        continue;
      }

      var ordered = /^(\s*)(\d+)\.\s+(.*)$/.exec(line);
      if (ordered) {
        var oDepth = Math.floor(ordered[1].replace(/\t/g, "  ").length / 2);
        item(oDepth, "ol", ordered[3], inOpenItems && oDepth === 0 ? "oi-" + ordered[2] : null);
        continue;
      }

      var bullet = /^(\s*)[-*+]\s+(.*)$/.exec(line);
      if (bullet) {
        var bDepth = Math.floor(bullet[1].replace(/\t/g, "  ").length / 2);
        item(bDepth, "ul", bullet[2], null);
        continue;
      }

      /* A plain line while a list item is open is a continuation of it. */
      if (stack.length && liOpen[liOpen.length - 1]) {
        out.push(" " + inline(line.trim()));
        continue;
      }

      para.push(line.trim());
    }

    flushPara();
    closeLists();
    return out.join("\n");
  }

  global.renderMarkdown = renderMarkdown;
})(window);
