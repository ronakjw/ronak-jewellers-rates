importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:"AIzaSyAI1-Kny1O1kMmQGLMtSTjEUUBq-VP5xF0",
  authDomain:"ronak-jewellers-8c791.firebaseapp.com",
  projectId:"ronak-jewellers-8c791",
  storageBucket:"ronak-jewellers-8c791.firebasestorage.app",
  messagingSenderId:"447664824926",
  appId:"1:447664824926:web:8ac928928387e12cb74acf"
});

try {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title =
      payload?.notification?.title ||
      payload?.data?.title ||
      "Ronak Jewellers";

    const options = {
      body:
        payload?.notification?.body ||
        payload?.data?.body ||
        "New notification from Ronak Jewellers",
      icon: "/logo.png",
      badge: "/logo.png",
      data: payload?.data || {},
    };

    self.registration.showNotification(title, options);
  });
} catch (err) {
  console.error("Firebase messaging service worker error:", err);
}
