export default function CommentForm() {
  return (
    <section className="pro-comment-form">
      <div className="pro-section-title">
        <p className="v2-eyebrow">Discussion</p>
        <h2>Leave a Reply</h2>
        <span>Your email address will not be published. Required fields are marked *</span>
      </div>
      <form>
        <div className="pro-comment-grid">
          <label>
            <span>Name *</span>
            <input type="text" name="name" placeholder="Your name" />
          </label>
          <label>
            <span>Email *</span>
            <input type="email" name="email" placeholder="you@example.com" />
          </label>
          <label>
            <span>Website</span>
            <input type="url" name="website" placeholder="https://example.com" />
          </label>
        </div>
        <label className="pro-comment-message">
          <span>Comment *</span>
          <textarea name="comment" rows={6} placeholder="Write your comment..." />
        </label>
        <label className="pro-save-info">
          <input type="checkbox" name="saveInfo" />
          <span>Save my name, email, and website in this browser for the next time I comment.</span>
        </label>
        <button type="button" className="btn btn-primary">Post Comment</button>
      </form>
    </section>
  );
}
