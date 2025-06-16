let gl;

window.onload = function () {
  const canvas = document.getElementById('glcanvas');
  gl = canvas.getContext('webgl');
  if (!gl) {
    alert("WebGL not supported!");
    return;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.1, 0.1, 0.1, 1.0);  // Βήμα 1: σκούρο γκρι φόντο
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Αρχικοποιήσεις: shaders, buffers, matrices
  initScene();

  // Σύνδεση κουμπιών
  document.getElementById('redrawBtn').onclick = redraw;
  document.getElementById('startAnim').onclick = startAnimation;
  document.getElementById('stopAnim').onclick = stopAnimation;
};

function initScene() {
  // Βήμα 1: Δημιουργία κύβου
  // Βήμα 2: Κάμερα
  // Βήμα 5+: Robot, υφές, κίνηση
}

function redraw() {
  // Επανασχεδίαση με νέα παραμέτρους κάμερας
}

function startAnimation() {
  // Έναρξη animation κάμερας
}

function stopAnimation() {
  // Παύση animation
}
