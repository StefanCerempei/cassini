import React from 'react';
import './Footer.css';

const Footer = ({ version = '1.0.0' }) => {
    const year = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-section">
                    <div className="footer-logo">
                        <span>💧</span>
                        <h3>AquaLeaks AI</h3>
                    </div>
                    <p>Detectare scurgeri apă prin satelit folosind inteligență artificială și date Sentinel-2.</p>
                    <div className="social-links">
                        <a href="#">🐙 GitHub</a>
                        <a href="#">🐦 Twitter</a>
                        <a href="#">🔗 LinkedIn</a>
                    </div>
                </div>

                <div className="footer-section">
                    <h4>Produs</h4>
                    <ul>
                        <li><a href="#">Caracteristici</a></li>
                        <li><a href="#">Cum funcționează</a></li>
                        <li><a href="#">Demo</a></li>
                        <li><a href="#">Prețuri</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h4>Companie</h4>
                    <ul>
                        <li><a href="#">Despre noi</a></li>
                        <li><a href="#">Cariere</a></li>
                        <li><a href="#">Blog</a></li>
                        <li><a href="#">Contact</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h4>Suport</h4>
                    <ul>
                        <li><a href="#">Documentație</a></li>
                        <li><a href="#">API</a></li>
                        <li><a href="#">FAQ</a></li>
                        <li><a href="#">Status</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h4>Legal</h4>
                    <ul>
                        <li><a href="#">Confidențialitate</a></li>
                        <li><a href="#">Termeni</a></li>
                        <li><a href="#">Cookie-uri</a></li>
                        <li><a href="#">GDPR</a></li>
                    </ul>
                </div>
            </div>

            <div className="footer-bottom">
                <div className="tech-stack">
                    <span>🛰️ Sentinel-2</span>
                    <span>⚛️ React</span>
                    <span>🐍 Flask</span>
                    <span>🍃 Leaflet</span>
                </div>
                <div className="copyright">
                    © {year} AquaLeaks AI. Toate drepturile rezervate. v{version}
                </div>
                <div className="sustainability">
                    🌱 Contribuim la ODD 6 - Apă curată și sanitație
                </div>
            </div>
        </footer>
    );
};

export default Footer;