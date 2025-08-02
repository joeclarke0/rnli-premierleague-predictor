const Footer = () => {
  return (
    <footer className="footer-banner">
      <div className="footer-content">
        <div className="how-it-works-footer">
          <div className="footer-steps">
            <div className="footer-step">
              <span className="footer-step-number">1</span>
              <div className="footer-step-content">
                <h5>Make Predictions</h5>
                <p>Select a gameweek and predict the scores for each match.</p>
              </div>
            </div>
            <div className="footer-step">
              <span className="footer-step-number">2</span>
              <div className="footer-step-content">
                <h5>Submit Results</h5>
                <p>Admins enter the actual match results to calculate points.</p>
              </div>
            </div>
            <div className="footer-step">
              <span className="footer-step-number">3</span>
              <div className="footer-step-content">
                <h5>Score Points</h5>
                <p>Earn points: 5 for exact score, 2 for correct result.</p>
              </div>
            </div>
            <div className="footer-step">
              <span className="footer-step-number">4</span>
              <div className="footer-step-content">
                <h5>Compete</h5>
                <p>Track your progress on the leaderboard and compete.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-signature">
          A Mega Pint? .... Were you there?
        </div>
      </div>
    </footer>
  )
}

export default Footer 