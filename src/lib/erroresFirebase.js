const MENSAJES = {
  'auth/email-already-in-use': 'Ese correo ya tiene una cuenta creada.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/network-request-failed': 'No hay conexión a internet. Intenta de nuevo.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  'permission-denied': 'No tienes permiso para hacer esto.',
}

export function mensajeErrorAmigable(err) {
  return MENSAJES[err?.code] ?? 'Ocurrió un error inesperado. Intenta de nuevo o avisa al administrador.'
}
