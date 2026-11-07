/*! PagAmerican tracker. Contrato: data-pag-site na tag; data-pag-track no CTA. Nunca impede clique. */
(function (w, d) {
'use strict';
var SNAPSHOT_PATH = 'z1';
var OUR_HOSTS = { 'pay.pagamerican.app': 1, 'pay.pagamerican.com.br': 1 };
var WRAPPED_RE = /^((https?:)?\/\/)?pay\.pagamerican\.(app|com\.br)\//i;
var SITE_RE = /^[A-Za-z0-9_-]{4,64}(,[A-Za-z0-9_-]{4,64}){0,4}$/;
var ID_RE = /^pag_[A-Za-z0-9_-]{22}$/;
var PARAM_RE = /^[A-Za-z0-9_.-]{1,64}$/;
var MAX_URL = 2048;
var MAX_SNAPSHOT_CHARS = 1800000;
var MAX_SNAPSHOT_BYTES = 1900000;
var RENEW_AFTER_MS = 23 * 3600 * 1000;
var MARKER_ABOVE_LINK = 3;
function noop() {}
function guard(fn) {
return function () {
try {
return fn.apply(null, arguments);
} catch (err) {
}
};
}
function findScript() {
if (d.currentScript && d.currentScript.hasAttribute('data-pag-site')) return d.currentScript;
var list = d.querySelectorAll('script[src][data-pag-site]');
for (var n = list.length - 1; n >= 0; n--) {
if (/\/api\/v1\/t\.js(\?|$)/.test(list[n].src)) return list[n];
}
return null;
}
function createTracker(script) {
var base = new URL(script.src, w.location.href).origin;
var sites = (script.getAttribute('data-pag-site') || '').replace(/\s+/g, '');
var pageParam = script.getAttribute('data-pag-param');
if (pageParam !== null && !PARAM_RE.test(pageParam)) pageParam = null;
var state = { id: null, p: 'pag_click_id', initAt: 0, visibleMs: 0, visibleSince: null, pt: 0, tc: 0, mv: 0, sc: 0, lastBeacon: 0 };
function visible() {
return state.visibleMs + (state.visibleSince === null ? 0 : Date.now() - state.visibleSince);
}
function isOurs(link) {
try {
return !!OUR_HOSTS[new URL(link.href).hostname];
} catch (e) {
return false;
}
}
function wrapsOurs(link) {
var found = false;
try {
var url = new URL(link.href);
if (!/^https?:$/.test(url.protocol)) return false;
url.searchParams.forEach(function (value) {
if (WRAPPED_RE.test(safeDecode(safeDecode(value)))) found = true;
});
} catch (e) {
found = false;
}
return found;
}
function targetOf(e) {
var path = typeof e.composedPath === 'function' ? e.composedPath() : [];
if (!path.length && e.target) path = [e.target];
var link = null;
var linkAt = -1;
var marker = null;
for (var n = 0; n < path.length; n++) {
var el = path[n];
if (!el || el.nodeType !== 1) continue;
if (link === null && el.tagName === 'A' && el.hasAttribute('href')) {
link = el;
linkAt = n;
}
if (marker === null && el.hasAttribute('data-pag-track')) {
if (link !== null && n - linkAt > MARKER_ABOVE_LINK) break;
marker = el;
}
if (link !== null && marker !== null) break;
}
if (link === null && marker === null) return null;
return { link: link, marker: marker };
}
function paramFor(target) {
var link = target.link;
if (link !== null && isOurs(link)) return state.p;
if (target.marker === null) return link !== null && wrapsOurs(link) ? state.p : null;
var slot = target.marker.getAttribute('data-pag-track');
if (slot && PARAM_RE.test(slot)) return slot;
return pageParam || state.p;
}
function escapeRe(value) {
return value.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
}
function safeDecode(value) {
try {
return decodeURIComponent(value);
} catch (e) {
return value;
}
}
function withParam(href, param, id) {
var hashAt = href.indexOf('#');
var hash = hashAt >= 0 ? href.slice(hashAt) : '';
var head = hashAt >= 0 ? href.slice(0, hashAt) : href;
var re = new RegExp('([?&])' + escapeRe(param) + '=([^&]*)');
var found = head.match(re);
if (found) {
var current = safeDecode(found[2]);
if (current === id) return href;
if (current !== '' && !ID_RE.test(current)) return null;
return head.replace(re, found[1] + param + '=' + id) + hash;
}
var sep = head.indexOf('?') < 0 ? '?' : /[?&]$/.test(head) ? '' : '&';
return head + sep + param + '=' + id + hash;
}
function withoutHash(url) {
var at = url.indexOf('#');
return at >= 0 ? url.slice(0, at) : url;
}
function decorate(link, param) {
if (!state.id || !param || link === null) return false;
if (!/^https?:$/.test(link.protocol || '')) return false;
var raw = (link.getAttribute('href') || '').replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '');
if (raw === '' || raw.charAt(0) === '#') return false;
if (withoutHash(link.href) === withoutHash(w.location.href)) return false;
var next = withParam(raw, param, state.id);
if (next === null) return false;
if (next !== link.getAttribute('href')) link.setAttribute('href', next);
return true;
}
function beacon() {
if (!state.id) return;
var now = Date.now();
if (now - state.lastBeacon < 1000) return;
state.lastBeacon = now;
var body = new URLSearchParams({ v: '1', i: state.id, vis: String(visible()), pt: String(state.pt), tc: String(state.tc), mv: String(state.mv), sc: String(state.sc) });
var url = base + '/api/v1/g';
var sent = false;
try {
if (w.navigator.sendBeacon) sent = w.navigator.sendBeacon(url, body);
} catch (e) {
sent = false;
}
if (!sent && w.fetch) w.fetch(url, { method: 'POST', mode: 'no-cors', credentials: 'omit', keepalive: true, body: body })['catch'](noop);
}
function onPress(e, kind) {
if (!e || e.isTrusted !== true) return;
if (kind === 'touch') state.tc++;
else state.pt++;
var target = targetOf(e);
if (target === null) return;
var param = paramFor(target);
if (param === null) return;
decorate(target.link, param);
w.setTimeout(guard(beacon), 0);
}
function onClick(e) {
if (!e) return;
var target = targetOf(e);
if (target === null) return;
var param = paramFor(target);
if (param === null) return;
decorate(target.link, param);
if (e.isTrusted === true) beacon();
}
function onVisibility() {
if (d.visibilityState === 'visible') {
if (state.visibleSince === null) state.visibleSince = Date.now();
renewIfStale();
} else if (state.visibleSince !== null) {
state.visibleMs += Date.now() - state.visibleSince;
state.visibleSince = null;
}
}
function renewIfStale() {
if (state.id && Date.now() - state.initAt > RENEW_AFTER_MS) init();
}
function stripVisitQuery(root) {
var search = w.location.search;
if (!search || search.length < 2) return;
var raw = search.slice(1);
var pieces = [raw];
var pairs = raw.split('&');
for (var n = 0; n < pairs.length; n++) if (pairs[n].length >= 6) pieces.push(pairs[n]);
var all = root.getElementsByTagName('*');
for (var i = 0; i < all.length; i++) {
var attrs = all[i].attributes;
for (var m = attrs.length - 1; m >= 0; m--) {
var value = attrs[m].value;
var next = value;
for (var p = 0; p < pieces.length; p++) if (next.indexOf(pieces[p]) >= 0) next = next.split(pieces[p]).join('');
if (next !== value) all[i].setAttribute(attrs[m].name, next.replace(/\?&+/, '?').replace(/&&+/g, '&').replace(/[?&]+(#|$)/, '$1'));
}
}
}
function serializeHtml() {
var doc = d.implementation.createHTMLDocument('');
var root = doc.importNode(d.documentElement, true);
var n;
var inputs = root.querySelectorAll('input');
for (n = 0; n < inputs.length; n++) {
var type = (inputs[n].getAttribute('type') || '').toLowerCase();
if (type === 'password') {
inputs[n].parentNode.removeChild(inputs[n]);
continue;
}
if (/^(submit|button|reset|image)$/.test(type)) continue;
inputs[n].removeAttribute('value');
inputs[n].removeAttribute('checked');
}
var areas = root.querySelectorAll('textarea');
for (n = 0; n < areas.length; n++) areas[n].textContent = '';
var options = root.querySelectorAll('option');
for (n = 0; n < options.length; n++) options[n].removeAttribute('selected');
stripVisitQuery(root);
var doctype = d.doctype ? '<!DOCTYPE ' + d.doctype.name + '>' : '';
return doctype + root.outerHTML;
}
function byteSize(text) {
try {
return new Blob([text]).size;
} catch (e) {
return text.length * 3;
}
}
function sendSnapshot(id, token) {
var html = serializeHtml();
if (html.length > MAX_SNAPSHOT_CHARS) return;
var body = JSON.stringify({ h: html });
if (byteSize(body) > MAX_SNAPSHOT_BYTES) return;
var url = base + '/api/v1/' + SNAPSHOT_PATH + '?i=' + encodeURIComponent(id) + '&k=' + encodeURIComponent(token);
w.fetch(url, { method: 'POST', mode: 'cors', credentials: 'omit', headers: { 'content-type': 'application/json' }, body: body })['catch'](noop);
}
function whenLoaded(fn) {
var done = false;
var run = guard(function () {
if (done) return;
done = true;
fn();
});
if (d.readyState === 'complete') {
w.setTimeout(run, 0);
return;
}
w.addEventListener('load', run);
w.setTimeout(run, 15000);
}
function pageUrl() {
var l = w.location;
return (l.origin + l.pathname + l.search + l.hash).slice(0, MAX_URL);
}
function init() {
if (!SITE_RE.test(sites) || !w.fetch) return;
var ref = '';
try {
ref = d.referrer ? new URL(d.referrer).origin : '';
} catch (e) {
ref = '';
}
w.fetch(base + '/api/v1/init', {
method: 'POST',
mode: 'cors',
credentials: 'omit',
headers: { 'content-type': 'application/json' },
body: JSON.stringify({ v: 1, s: sites, u: pageUrl(), r: ref })
})
.then(function (res) {
return res.status === 200 ? res.json() : null;
})
.then(
guard(function (data) {
if (!data || !ID_RE.test(data.i)) return;
state.id = data.i;
state.initAt = Date.now();
if (typeof data.p === 'string' && PARAM_RE.test(data.p)) state.p = data.p;
w.pag.clickId = data.i;
if (typeof data.k === 'string') {
whenLoaded(function () {
sendSnapshot(data.i, data.k);
});
}
})
)
['catch'](noop);
}
function start() {
var capture = { capture: true, passive: true };
onVisibility();
d.addEventListener('pointerdown', guard(function (e) { onPress(e, 'pointer'); }), capture);
d.addEventListener('touchstart', guard(function (e) { onPress(e, 'touch'); }), capture);
d.addEventListener('click', guard(onClick), capture);
d.addEventListener('auxclick', guard(onClick), capture);
d.addEventListener('pointermove', guard(function (e) { if (e.isTrusted) state.mv++; }), capture);
w.addEventListener('scroll', guard(function (e) { if (e.isTrusted) state.sc++; }), capture);
d.addEventListener('visibilitychange', guard(onVisibility), capture);
w.addEventListener('pageshow', guard(renewIfStale), capture);
init();
}
return { state: state, start: start, init: init, onPress: guard(onPress), onClick: guard(onClick), decorate: decorate, serializeHtml: serializeHtml, withParam: withParam, pageUrl: pageUrl, renewIfStale: renewIfStale };
}
try {
if (w.__pagTrackerStarted) return;
w.__pagTrackerStarted = true;
w.pag = w.pag || {};
var script = findScript();
if (!script) return;
var tracker = createTracker(script);
if (w.__PAG_TRACKER_TEST__) {
w.__PAG_TRACKER_TEST__.tracker = tracker;
return;
}
tracker.start();
} catch (e) {
}
})(window, document);