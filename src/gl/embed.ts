/**
 * The JOYCO Hub embeds experiments in an iframe and appends `?lab=true`
 * (joyco-studio/hub components/lab/experiment-iframe.tsx). There the visitor
 * arrives with a mouse, so the pointer stays visible and a click hands the
 * keyboard to the terminal.
 */
const LAB_PARAM = "lab";

export function isLabEmbed(): boolean {
  return new URLSearchParams(window.location.search).get(LAB_PARAM) === "true";
}
