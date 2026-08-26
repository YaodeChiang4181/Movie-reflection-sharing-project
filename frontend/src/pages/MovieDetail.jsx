import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Clock, Calendar, ThumbsUp, ThumbsDown, User, MessageCircle, Send, Edit2, Trash2, MoreVertical, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import styles from './MovieDetail.module.css';
import ReviewForm from '../components/ReviewForm';
import TmdbPoster from '../components/TmdbPoster';
import ReviewModal from '../components/ReviewModal';
import UserCardModal from '../components/UserCardModal';

function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [relatedMovies, setRelatedMovies] = useState([]);
  const { isLoggedIn } = useAuth();
  const [isComposing, setIsComposing] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedUserCampusId, setSelectedUserCampusId] = useState(null);

  const handleComposeClick = () => {
    if (!isLoggedIn) {
      alert('請先登入後再發布心得！');
      navigate('/auth');
      return;
    }
    setIsComposing(true);
  };

  // Fetch movie info (only once when id changes)
  useEffect(() => {
    const fetchMovieData = async () => {
      try {
        setIsLoading(true);
        const movieRes = await api.get(`movies/${id}/`);
        setMovie(movieRes.data);
        
        try {
          const relatedRes = await api.get(`movies/${id}/related/`);
          setRelatedMovies(relatedRes.data);
        } catch (err) {
          console.error("Failed to fetch related movies", err);
        }
      } catch (error) {
        console.error("Failed to fetch movie details:", error);
        if (error.response?.status === 404) {
          alert('找不到該部電影！');
          navigate('/');
        }
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchMovieData();
  }, [id, navigate]);

  const fetchReviews = async () => {
    if (!id) return;
    try {
      setIsReviewsLoading(true);
      const res = await api.get(`reviews/?movie=${id}&page=${currentPage}`);
      setReviews(res.data.results || res.data);
      if (res.data.count) {
        setTotalPages(Math.ceil(res.data.count / 20)); // Assuming PAGE_SIZE is 20
      } else {
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setIsReviewsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [id, currentPage]);

  if (isLoading) {
    return (
      <div className={`container ${styles.pageWrapper}`} style={{ textAlign: 'center', paddingTop: '100px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
      </div>
    );
  }

  if (!movie) return null;

  // Calculate average rating
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className={`container ${styles.pageWrapper}`}>
      <div>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: movie.original_title ? '4px' : '0' }}>
              <button 
                onClick={() => navigate('/')}
                style={{ 
                  position: 'absolute',
                  left: 0,
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
                className="hover-text-primary"
              >
                <ArrowLeft size={24} />
                <span style={{ fontSize: '0.9rem' }}>返回</span>
              </button>
              <h1 className={styles.title} style={{ textAlign: 'center', margin: 0 }}>{movie.title}</h1>
            </div>
            {movie.original_title && (
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem', fontStyle: 'italic', letterSpacing: '0.5px' }}>
                {movie.original_title}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '32px 0' }}>
            <TmdbPoster 
              title={movie.title} 
              style={{ width: '220px', height: '330px', borderRadius: '16px', boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }} 
            />
          </div>

          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div className={styles.ratingBox}>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    size={24} 
                    className={styles.starIcon} 
                    fill={star <= Math.round(avgRating) ? "currentColor" : "none"} 
                    style={{ color: star <= Math.round(avgRating) ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                  />
                ))}
              </div>
              <span className={styles.ratingText}>{avgRating} / 5.0 (來自 {reviews.length} 則影評)</span>
            </div>
          </div>

          <div className={styles.reviewSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0 }}>影評列表</h3>
              <button 
                onClick={handleComposeClick} 
                className="btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.9rem' }}
              >
                <Edit2 size={16} />
                增加心得
              </button>
            </div>

            {isComposing && (
              <ReviewForm 
                onClose={() => setIsComposing(false)} 
                onReviewAdded={fetchReviews} 
                prefilledMovieTitle={movie.title}
              />
            )}

            {isReviewsLoading ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>載入中...</p>
            ) : reviews.length > 0 ? (
              <>
                {/* 分為三區塊: 熱門、一般、簡易分數 */}
                {(() => {
                  const isSpeedRating = (r) => !r.content || r.content === "來自急速評星的無內文評價" || r.tags?.some(tag => tag.name === '急速評星');
                  
                  const hotReviews = reviews.filter(r => !isSpeedRating(r) && r.upvotes > 0).sort((a,b) => b.upvotes - a.upvotes);
                  const normalReviews = reviews.filter(r => !isSpeedRating(r) && r.upvotes === 0);
                  const speedRatings = reviews.filter(r => isSpeedRating(r));
                  
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {hotReviews.length > 0 && (
                        <div>
                          <h4 style={{ color: 'var(--accent-primary)', marginBottom: '16px', fontSize: '1.2rem' }}>🔥 熱度心得貼文</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {hotReviews.map(review => (
                              <ReviewCard key={review.id} review={review} onReviewDeleted={fetchReviews} onReviewUpdated={fetchReviews} onCardClick={() => setSelectedReview(review)} onUserClick={(campusId) => setSelectedUserCampusId(campusId)} />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {normalReviews.length > 0 && (
                        <div>
                          <h4 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1.2rem' }}>📝 一般心得貼文</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {normalReviews.map(review => (
                              <ReviewCard key={review.id} review={review} onReviewDeleted={fetchReviews} onReviewUpdated={fetchReviews} onCardClick={() => setSelectedReview(review)} onUserClick={(campusId) => setSelectedUserCampusId(campusId)} />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {speedRatings.length > 0 && (
                        <div>
                          <h4 style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '1.2rem' }}>⭐ 簡易心得版塊 (急速評星)</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                            {speedRatings.map(review => (
                              <div key={review.id} className="glass" style={{ padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {review.user?.avatar ? (
                                    <img src={review.user.avatar} alt="avatar" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                                  ) : (
                                    <User size={16} style={{ color: 'var(--text-secondary)' }} />
                                  )}
                                  {review.user?.nickname || '匿名'}
                                </span>
                                <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Star size={16} fill="currentColor" /> {review.rating} / 5
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      上一頁
                    </button>
                    <span style={{ color: 'var(--text-secondary)' }}>第 {currentPage} 頁 / 共 {totalPages} 頁</span>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      下一頁
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: 'var(--text-secondary)', padding: '20px 0' }}>目前還沒有影評，來成為第一位評論的人吧！</p>
            )}
          </div>

          {relatedMovies.length > 0 && (
            <div style={{ marginTop: '48px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>✨ 根據心得標籤推薦給您...</h3>
              <div style={{ 
                display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px',
                scrollbarWidth: 'thin', scrollbarColor: 'var(--border-color) transparent'
              }}>
                {relatedMovies.map(m => (
                  <div 
                    key={m.id} 
                    className="glass hover-scale"
                    style={{ minWidth: '140px', padding: '12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                    onClick={() => navigate(`/movies/${m.id}`)}
                  >
                    <TmdbPoster title={m.title} style={{ width: '100px', height: '150px', borderRadius: '8px' }} />
                    <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem', textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {m.title}
                    </h4>
                    <span style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Star size={14} fill="currentColor" /> {m.avg_rating?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="btn-primary" style={{marginTop: '24px'}} onClick={() => navigate('/')}>
            回首頁看更多
          </button>
        </div>
      </div>
      {selectedReview && (
        <ReviewModal 
          review={selectedReview} 
          onClose={() => setSelectedReview(null)} 
          onReviewUpdated={fetchReviews}
          onReviewDeleted={() => {
            setSelectedReview(null);
            fetchReviews();
          }}
        />
      )}
      {selectedUserCampusId && (
        <UserCardModal
          campusId={selectedUserCampusId}
          onClose={() => setSelectedUserCampusId(null)}
        />
      )}
    </div>
  );
}

function ReviewCard({ review, onReviewDeleted, onReviewUpdated, onCardClick, onUserClick }) {
  const { isLoggedIn, userProfile } = useAuth();
  const [upvotes, setUpvotes] = useState(review.upvotes || 0);
  const [downvotes, setDownvotes] = useState(review.downvotes || 0);
  const [currentVote, setCurrentVote] = useState(review.user_voted || 0);
  const [isVoting, setIsVoting] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const isAuthor = isLoggedIn && userProfile?.campus_id === review.user?.campus_id;
  
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentsCount, setCommentsCount] = useState(review.comments_count || 0);

  const handleDelete = async () => {
    if (window.confirm("確定要刪除這篇心得嗎？")) {
      try {
        await api.delete(`reviews/${review.id}/`);
        if (onReviewDeleted) onReviewDeleted(review.id);
      } catch (err) {
        alert("刪除失敗");
      }
    }
  };

  const fetchComments = async () => {
    try {
      const res = await api.get(`reviews/${review.id}/comments/`);
      setComments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleComments = () => {
    if (!showComments) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !isLoggedIn) return;
    try {
      const res = await api.post(`reviews/${review.id}/comments/`, { content: newComment });
      setComments([res.data, ...comments]);
      setNewComment('');
      setCommentsCount(c => c + 1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVote = async (voteType) => {
    if (isVoting) return;
    
    // 儲存先前的狀態，以便失敗時復原
    const prevVote = currentVote;
    const prevUpvotes = upvotes;
    const prevDownvotes = downvotes;
    
    // 1. 樂觀地立即更新畫面 (Optimistic Update)
    setIsVoting(true);
    let newUpvotes = upvotes;
    let newDownvotes = downvotes;
    let newCurrentVote = voteType;

    if (currentVote === voteType) {
      // 收回投票
      newCurrentVote = 0;
      if (voteType === 1) newUpvotes -= 1;
      if (voteType === -1) newDownvotes -= 1;
    } else {
      // 改變投票或新投票
      if (currentVote === 1) newUpvotes -= 1;
      if (currentVote === -1) newDownvotes -= 1;
      
      if (voteType === 1) newUpvotes += 1;
      if (voteType === -1) newDownvotes += 1;
    }

    setCurrentVote(newCurrentVote);
    setUpvotes(newUpvotes);
    setDownvotes(newDownvotes);

    // 2. 發送背景 API 請求
    try {
      await api.post(`reviews/${review.id}/vote/`, { vote_type: voteType });
    } catch (error) {
      // 3. 失敗處理：退回原狀態並提示錯誤
      setCurrentVote(prevVote);
      setUpvotes(prevUpvotes);
      setDownvotes(prevDownvotes);
      
      if (error.response?.status === 401) {
        alert('請先登入才能投票！');
      } else {
        alert('投票失敗，請稍後再試。');
      }
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className={styles.reviewCard} onClick={onCardClick} style={{ cursor: onCardClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            onClick={(e) => { 
              e.stopPropagation(); 
              if (onUserClick && review.user?.campus_id) onUserClick(review.user.campus_id); 
            }}
          >
            <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 'bold', overflow: 'hidden', flexShrink: 0 }}>
              {review.user?.avatar ? (
                <img src={review.user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                review.user?.nickname ? review.user.nickname.charAt(0).toUpperCase() : '?'
              )}
            </div>
            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }} className="hover-bg-tertiary">
              {review.user?.nickname || '未知使用者'}
            </span>
          </div>
          <span>給了 {review.rating} 顆星</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {new Date(review.created_at).toLocaleDateString('zh-TW')}
          </span>
          {isAuthor && (
            <div style={{ position: 'relative' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <MoreVertical size={18} />
              </button>
              
              {showMenu && (
                <div style={{ 
                  position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  borderRadius: '8px', overflow: 'hidden', zIndex: 10, minWidth: '120px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); setShowMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left' }}
                    className="hover-bg-tertiary"
                  >
                    <Edit2 size={16} /> 編輯
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(); setShowMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', textAlign: 'left' }}
                    className="hover-bg-tertiary"
                  >
                    <Trash2 size={16} /> 刪除
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <ReviewForm 
          initialData={review}
          onReviewAdded={() => { setIsEditing(false); if(onReviewUpdated) onReviewUpdated(); }}
          onClose={() => setIsEditing(false)}
        />
      ) : (
        <>
          <div style={{ position: 'relative' }}>
            <p 
          className={styles.reviewText}
          style={review.is_spoiler && !isRevealed ? { filter: 'blur(8px)', userSelect: 'none', cursor: 'pointer' } : {}}
          onClick={(e) => { if(review.is_spoiler && !isRevealed) { e.stopPropagation(); setIsRevealed(true); } }}
        >
          {review.content}
        </p>
        
        {review.is_spoiler && !isRevealed && (
          <div 
            style={{ 
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 'bold', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }}
            onClick={(e) => { e.stopPropagation(); setIsRevealed(true); }}
          >
            ⚠️ 包含劇透，點擊解鎖
          </div>
        )}
      </div>
      
      {review.tags && review.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
          {review.tags.map(tag => (
            <span 
              key={tag.id} 
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'var(--accent-primary)',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '0.85rem',
                fontWeight: '500'
              }}
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}      
      <div className={styles.voteActions} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button 
                className={`${styles.voteBtn} ${currentVote === 1 ? styles.voteActive : ''}`}
                onClick={(e) => { e.stopPropagation(); handleVote(1); }}
                disabled={isVoting}
                aria-label="推"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: currentVote === 1 ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
              >
                <ThumbsUp size={16} />
              </button>
              <span className={styles.voteCount} style={{ color: currentVote === 1 ? 'var(--accent-primary)' : 'var(--text-primary)', fontWeight: 'bold' }}>
                {upvotes}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
              <button 
                className={`${styles.voteBtn} ${currentVote === -1 ? styles.voteActiveDown : ''}`}
                onClick={(e) => { e.stopPropagation(); handleVote(-1); }}
                disabled={isVoting}
                aria-label="噓"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: currentVote === -1 ? 'var(--danger)' : 'var(--text-secondary)' }}
              >
                <ThumbsDown size={16} />
              </button>
              <span className={styles.voteCount} style={{ color: currentVote === -1 ? 'var(--danger)' : 'var(--text-primary)', fontWeight: 'bold' }}>
                {downvotes}
              </span>
            </div>
          </div>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); toggleComments(); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
        >
          <MessageCircle size={16} /> 留言 ({commentsCount})
        </button>
      </div>

      {showComments && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
          {isLoggedIn ? (
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <input 
                type="text" 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="留下您的評論..."
                style={{
                  flex: 1, padding: '10px 16px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', 
                  color: 'var(--text-primary)', outline: 'none'
                }}
              />
              <button 
                type="submit" 
                disabled={!newComment.trim()}
                style={{
                  background: 'var(--accent-primary)', border: 'none', color: 'white', 
                  padding: '0 16px', borderRadius: '8px', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <Send size={16} />
              </button>
            </form>
          ) : (
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>請先登入後再留言。</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {comments.map(c => (
              <div key={c.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>{c.user?.nickname}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleString('zh-TW')}</span>
                </div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                  {c.content}
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0', fontSize: '0.9rem' }}>
                目前還沒有留言，來搶頭香吧！
              </p>
            )}
          </div>
        </div>
      )}
      </>
    )}
    </div>
  );
}

export default MovieDetail;

