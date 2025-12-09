/**
 * Visitor Tracker for EDI Developer Hub
 * Connected to Firebase Firestore
 */

import { db, addDoc, collection, serverTimestamp, auth } from "./firebase-config.js";

// Note: No need to init app or analytics here, as they are init in firebase-config.js
// We import 'db' directly.

(async function initTracker() {
    // Avoid tracking admins (if logged in via Firebase Auth)
    if (auth.currentUser) {
        console.log('Tracker: Admin user detected, skipping tracking.');
        return;
    }

    // Session check to prevent spamming repeats on refresh
    if (sessionStorage.getItem('edi_visit_logged_cloud')) {
        console.log('Tracker: Visit already logged to cloud this session.');
        return;
    }

    async function getVisitorData() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            if (!response.ok) throw new Error('API limit');
            return await response.json();
        } catch (error) {
            console.warn('Tracker: Generic IP data');
            return {
                ip: 'Unknown',
                city: 'Unknown',
                country_name: 'Unknown',
                country_code: 'UN'
            };
        }
    }

    try {
        const data = await getVisitorData();

        const visitData = {
            timestamp: serverTimestamp(), // Use server time
            ip: data.ip,
            location: `${data.city}, ${data.country_name}`,
            countryCode: data.country_code,
            userAgent: navigator.userAgent,
            page: window.location.pathname,
            device: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
        };

        await addDoc(collection(db, "visits"), visitData);

        sessionStorage.setItem('edi_visit_logged_cloud', 'true');
        console.log('Tracker: Visit logged to Firestore', visitData);

    } catch (e) {
        console.error("Tracker: Error adding document: ", e);
    }
})();
