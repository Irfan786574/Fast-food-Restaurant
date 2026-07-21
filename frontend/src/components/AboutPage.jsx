import React from 'react';
import { Link } from 'react-router-dom';

const AboutPage = () => {
  return (
    <div className="about-layout-wrapper">
      <section className="about-us">
        <header>
          <h1>Welcome to HR Fastfood</h1>
          <p>Your go-to destination for fresh, delicious, and affordable fast food served with a smile!</p>
        </header>

        <div className="content">
          <section className="who-we-are">
            <h2>Who We Are</h2>
            <p>At HR Fastfood, we're more than just a fast food brand — we're a team of passionate food lovers committed to offering delicious and quick meals to satisfy your hunger.</p>
          </section>

          <section className="our-mission">
            <h2>Our Mission</h2>
            <p>Our mission is to revolutionize the fast food experience by offering high-quality meals, served fast and fresh, without compromising on taste or affordability.</p>
          </section>

          <section className="why-choose-us">
            <h2>Why Choose HR Fastfood?</h2>
            <ul>
              <li><strong>Fresh Ingredients:</strong> Locally sourced ingredients in every dish.</li>
              <li><strong>Fast and Friendly Service:</strong> Quick service without compromising quality.</li>
              <li><strong>Variety:</strong> Classic favorites and exciting new flavors.</li>
              <li><strong>Affordable Prices:</strong> Budget-friendly, without cutting corners.</li>
            </ul>
          </section>

          <section className="join-us">
            <h2><Link to="/orders">Join Us</Link></h2>
            <p>Want to learn more? Head over to your <Link to="/orders">orders page</Link> to reach out via our contact form.</p>
          </section>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
