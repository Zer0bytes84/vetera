try { eval("1"); window.__probe = { eval: false }; } catch (e) { window.__probe = { eval: true }; }
try { new Function("return 1")(); window.__probe.fn = false; } catch (e) { window.__probe.fn = true; }
