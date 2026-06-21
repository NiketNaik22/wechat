import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Users, MessageSquare, Share2, Menu, X, UserPlus, Search, Check, XCircle, Clock, Trash2, UserMinus, Ban, Unlock } from 'lucide-react';
import { getMyFriends, getUsers, sendFriendRequest, getFriendRequests, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest, unfriendUser, blockUser, unblockUser, connectWebSocket, disconnectWebSocket, addNotificationListener, removeNotificationListener } from '../api';
import type { User, FriendRequest } from '../api';
import './Dashboard.css';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'profiles';
  
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');
  const [allFriends, setAllFriends] = useState<User[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<User[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);

  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [allGlobalUsers, setAllGlobalUsers] = useState<User[]>([]);
  const [filteredGlobalUsers, setFilteredGlobalUsers] = useState<User[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  const [activeDropdownMenu, setActiveDropdownMenu] = useState<number | null>(null);

  // New state to explicitly track unseen notifications even if tab is changed
  const [hasNewAcceptedRequest, setHasNewAcceptedRequest] = useState(false);

  // Define the listener using a ref to avoid stale closures
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  useEffect(() => {
    fetchRequestsGlobally();
    connectWebSocket();

    const handleNotification = (notification: FriendRequest) => {
       console.log("New WebSocket Notification Received:", notification);
       
       if (notification.status === 'PENDING') {
           setFriendRequests(prev => {
               if (!prev.some(req => req.id === notification.id)) {
                   return [...prev, notification];
               }
               return prev;
           });
       } else if (notification.status === 'ACCEPTED' || notification.status === 'REJECTED') {
           fetchRequestsGlobally(true);
           
           if (activeTabRef.current === 'friends') {
               fetchFriendsListOnly();
           } else if (notification.status === 'ACCEPTED') {
               setHasNewAcceptedRequest(true);
           }
       } else if (notification.status === null || notification.status === 'BLOCKED') {
           setFriendRequests(prev => prev.filter(req => req.id !== notification.id));
       }
    };

    addNotificationListener(handleNotification);

    return () => {
       removeNotificationListener(handleNotification);
       disconnectWebSocket();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'friends') {
      fetchFriendsListOnly();
      // Clear the "new accepted request" notification when the user opens the friends tab
      setHasNewAcceptedRequest(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (friendsSearchQuery.trim() === '') {
      setFilteredFriends(allFriends);
    } else {
      const lowerQuery = friendsSearchQuery.toLowerCase();
      const filtered = allFriends.filter(u => 
        (u.username && u.username.toLowerCase().includes(lowerQuery)) ||
        (u.displayName && u.displayName.toLowerCase().includes(lowerQuery)) ||
        (u.email && u.email.toLowerCase().includes(lowerQuery))
      );
      setFilteredFriends(filtered);
    }
  }, [friendsSearchQuery, allFriends]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdownMenu !== null && !(event.target as Element).closest('.dropdown-container')) {
        setActiveDropdownMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdownMenu]);

  const fetchRequestsGlobally = async (isSilent = false) => {
    if (!isSilent) setIsLoadingRequests(true);
    try {
        const requestsResponse = await getFriendRequests();
        const relevantRequests = requestsResponse.data.filter(req => req.status === 'PENDING' || req.status === 'BLOCKED');
        
        setFriendRequests(prevRequests => {
           if (prevRequests.length !== relevantRequests.length) return relevantRequests;
           const prevIds = prevRequests.map(r => `${r.id}-${r.status}-${r.isReceived}`).sort().join(',');
           const currIds = relevantRequests.map(r => `${r.id}-${r.status}-${r.isReceived}`).sort().join(',');
           return prevIds !== currIds ? relevantRequests : prevRequests;
        });
    } catch (error) {
        console.error("Failed to fetch friend requests globally", error);
    } finally {
        if (!isSilent) setIsLoadingRequests(false);
    }
  };

  const fetchFriendsListOnly = async () => {
      setIsLoadingFriends(true);
      try {
          const friendsResponse = await getMyFriends();
          setAllFriends(friendsResponse.data);
          setFilteredFriends(friendsResponse.data);
      } catch (error) {
          console.error("Failed to fetch friends list", error);
      } finally {
          setIsLoadingFriends(false);
      }
  };

  const handleGlobalSearch = async () => {
      if (globalSearchQuery.trim() === '') {
          setFilteredGlobalUsers([]);
          return;
      }

      setIsSearchingGlobal(true);
      try {
          if (allGlobalUsers.length === 0) {
             const response = await getUsers();
             setAllGlobalUsers(response.data.filter(u => u.username !== user?.username));
          }
          
          const lowerQuery = globalSearchQuery.toLowerCase();
          const filtered = (allGlobalUsers.length > 0 ? allGlobalUsers : (await getUsers()).data.filter(u => u.username !== user?.username))
            .filter(u => 
              (u.username && u.username.toLowerCase().includes(lowerQuery)) ||
              (u.displayName && u.displayName.toLowerCase().includes(lowerQuery)) ||
              (u.email && u.email.toLowerCase().includes(lowerQuery))
          );
          setFilteredGlobalUsers(filtered);
      } catch (error) {
          console.error("Failed to search users", error);
      } finally {
          setIsSearchingGlobal(false);
      }
  };

  const handleSendFriendRequest = async (receiverId: number | undefined) => {
      if (!receiverId) return;
      try {
          await sendFriendRequest(receiverId);
          alert('Friend request sent!');
          fetchRequestsGlobally();
      } catch (error: any) {
          alert(error.response?.data?.message || 'Failed to send request.');
      }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await acceptFriendRequest(requestId);
      fetchFriendsListOnly();
      fetchRequestsGlobally();
    } catch (error) {
      console.error("Failed to accept friend request", error);
      alert("Failed to accept friend request.");
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await rejectFriendRequest(requestId);
      setFriendRequests(friendRequests.filter(req => req.id !== requestId));
    } catch (error) {
      console.error("Failed to reject friend request", error);
      alert("Failed to reject friend request.");
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    try {
      await cancelFriendRequest(requestId);
      setFriendRequests(friendRequests.filter(req => req.id !== requestId));
    } catch (error) {
      console.error("Failed to cancel friend request", error);
      alert("Failed to cancel friend request.");
    }
  };

  const handleUnfriend = async (friendId: number | undefined) => {
    if (!friendId) return;
    if (window.confirm("Are you sure you want to unfriend this user?")) {
        try {
            await unfriendUser(friendId);
            setAllFriends(allFriends.filter(f => f.id !== friendId));
            setActiveDropdownMenu(null);
        } catch (error) {
            console.error("Failed to unfriend user", error);
            alert("Failed to unfriend user.");
        }
    }
  };

  const handleBlockUser = async (friendId: number | undefined) => {
    if (!friendId) return;
    if (window.confirm("Are you sure you want to block this user?")) {
        try {
            await blockUser(friendId);
            setAllFriends(allFriends.filter(f => f.id !== friendId));
            setFilteredGlobalUsers(filteredGlobalUsers.filter(u => u.id !== friendId));
            setAllGlobalUsers(allGlobalUsers.filter(u => u.id !== friendId));
            setActiveDropdownMenu(null);
            alert('User blocked successfully.');
            fetchRequestsGlobally();
        } catch (error) {
            console.error("Failed to block user", error);
            alert("Failed to block user.");
        }
    }
  };

  const handleUnblockUser = async (userId: number | undefined) => {
      if (!userId) return;
      try {
          await unblockUser(userId);
          alert('User unblocked successfully.');
          fetchRequestsGlobally();
      } catch (error) {
          console.error("Failed to unblock user", error);
          alert("Failed to unblock user.");
      }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleTabChange = (tab: string) => {
    navigate(`?tab=${tab}`, { replace: true });
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const toggleDropdown = (userId: number | undefined, event: React.MouseEvent) => {
      event.stopPropagation();
      if (userId === undefined) return;
      setActiveDropdownMenu(activeDropdownMenu === userId ? null : userId);
  };

  const pendingRequestsList = friendRequests.filter(req => req.status === 'PENDING');
  const pendingReceivedCount = pendingRequestsList.filter(req => req.isReceived === true).length;

  const isUserBlockedByMe = (userId: number | undefined) => {
      if (!userId) return false;
      return friendRequests.some(req => req.status === 'BLOCKED' && req.user.id === userId && !req.isReceived);
  };
  
  const getPendingRequestWithUser = (userId: number | undefined) => {
      if (!userId) return null;
      return friendRequests.find(req => req.status === 'PENDING' && req.user.id === userId);
  };

  return (
    <div className="dashboard-container">
      <div className="mobile-header">
        <button onClick={toggleSidebar} className="menu-btn">
          <Menu size={24} />
        </button>
        <h1>ChatApp</h1>
        <div className="mobile-actions">
           <button onClick={onLogout} className="logout-btn-mobile" title="Logout">
              <LogOut size={20} />
           </button>
        </div>
      </div>

      <div className="dashboard-body">
        <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2>ChatApp</h2>
            <button onClick={toggleSidebar} className="close-btn mobile-only">
              <X size={24} />
            </button>
          </div>
          
          <div className="mobile-profile-section mobile-only">
             <div className="user-info-mobile">
                <span className="user-name">{user?.displayName || 'User'}</span>
                <span className="user-username">@{user?.username || 'username'}</span>
             </div>
          </div>
          
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeTab === 'profiles' ? 'active' : ''}`}
              onClick={() => handleTabChange('profiles')}
            >
              <div className="nav-item-content">
                <Users size={20} />
                <span>My Profile</span>
              </div>
            </button>
            <button 
              className={`nav-item ${activeTab === 'friends' ? 'active' : ''}`}
              onClick={() => handleTabChange('friends')}
            >
              <div className="nav-item-content">
                 <UserPlus size={20} />
                 <span>Friends</span>
              </div>
              {/* Show badge if there are pending received requests OR a new accepted friend notification */}
              {(pendingReceivedCount > 0 || hasNewAcceptedRequest) && (
                <span className="badge">
                    {pendingReceivedCount > 0 ? pendingReceivedCount : "1"}
                </span>
              )}
            </button>
            <button 
              className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => handleTabChange('messages')}
            >
              <div className="nav-item-content">
                 <MessageSquare size={20} />
                 <span>Messages</span>
              </div>
            </button>
            <button 
              className={`nav-item ${activeTab === 'status' ? 'active' : ''}`}
              onClick={() => handleTabChange('status')}
            >
              <div className="nav-item-content">
                 <Share2 size={20} />
                 <span>Status</span>
              </div>
            </button>
          </nav>
        </aside>

        {isSidebarOpen && (
          <div className="sidebar-overlay" onClick={toggleSidebar}></div>
        )}

        <div className="dashboard-main-area">
          <header className="dashboard-header desktop-only">
            <h2>
               {activeTab === 'profiles' ? 'My Profile' : 
                activeTab === 'friends' ? 'Friends' : 
                activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
            
            {activeTab === 'friends' && (
              <div className="search-container desktop-search">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search friends by name, username, or email..." 
                  value={friendsSearchQuery}
                  onChange={(e) => setFriendsSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            )}

            <div className="user-profile">
              <div className="user-info">
                <span className="user-name">{user?.displayName || 'User'}</span>
                <span className="user-username">@{user?.username || 'username'}</span>
              </div>
              <button onClick={onLogout} className="logout-btn-dashboard" title="Logout">
                <LogOut size={20} />
                <span className="logout-text">Logout</span>
              </button>
            </div>
          </header>

          <main className="dashboard-main-content">
            <h2 className="mobile-only page-title-mobile">
               {activeTab === 'profiles' ? 'My Profile' : 
                activeTab === 'friends' ? 'Friends' : 
                activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
            
            {activeTab === 'friends' && (
              <div className="search-container mobile-search mobile-only">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search friends..." 
                  value={friendsSearchQuery}
                  onChange={(e) => setFriendsSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            )}

            {activeTab === 'profiles' && (
              <div className="my-profile-container">
                  <div className="tab-content current-user-profile">
                    <div className="profile-header-large">
                       <div className="profile-avatar-large">
                          {user?.displayName ? user.displayName.charAt(0).toUpperCase() : '?'}
                       </div>
                       <div className="profile-info-large">
                          <h3>{user?.displayName || 'Your Name'}</h3>
                          <p className="profile-username">@{user?.username || 'username'}</p>
                       </div>
                    </div>
                    <div className="profile-details">
                       <div className="detail-group">
                          <label>Email Address</label>
                          <p>{user?.email || 'No email provided'}</p>
                       </div>
                       <div className="detail-group">
                          <label>Bio</label>
                          <p>{user?.bio || 'No bio provided yet.'}</p>
                       </div>
                    </div>
                  </div>

                  <div className="find-users-section tab-content">
                      <h3>Find New Friends</h3>
                      <div className="search-container global-search-container">
                        <Search size={18} className="search-icon" />
                        <input 
                          type="text" 
                          placeholder="Search users globally by name, username, or email..." 
                          value={globalSearchQuery}
                          onChange={(e) => setGlobalSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()}
                          className="search-input"
                        />
                        <button onClick={handleGlobalSearch} className="search-btn">Search</button>
                      </div>

                      {isSearchingGlobal ? (
                          <div className="loading-state">Searching...</div>
                      ) : filteredGlobalUsers.length > 0 ? (
                          <div className="table-responsive">
                              <table className="users-table">
                                  <thead>
                                      <tr>
                                          <th>User</th>
                                          <th>Email</th>
                                          <th>Action</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {filteredGlobalUsers.map(u => {
                                          const pendingRequest = getPendingRequestWithUser(u.id);
                                          return (
                                              <tr key={u.id}>
                                                  <td>
                                                      <div className="table-user-info">
                                                          <div className="table-avatar">{u.displayName ? u.displayName.charAt(0).toUpperCase() : '?'}</div>
                                                          <div>
                                                              <div className="table-name">{u.displayName}</div>
                                                              <div className="table-username">@{u.username}</div>
                                                          </div>
                                                      </div>
                                                  </td>
                                                  <td>{u.email}</td>
                                                  <td>
                                                      {isUserBlockedByMe(u.id) ? (
                                                          <button 
                                                              className="unblock-btn-small"
                                                              onClick={() => handleUnblockUser(u.id)}
                                                          >
                                                              <Unlock size={14} /> Unblock
                                                          </button>
                                                      ) : pendingRequest ? (
                                                          pendingRequest.isReceived ? (
                                                              <div className="action-buttons-row">
                                                                  <button 
                                                                      className="accept-btn-small"
                                                                      onClick={() => handleAcceptRequest(pendingRequest.id)}
                                                                  >
                                                                      <Check size={14} /> Accept
                                                                  </button>
                                                                  <button 
                                                                      className="reject-btn-small danger"
                                                                      onClick={() => handleRejectRequest(pendingRequest.id)}
                                                                  >
                                                                      <XCircle size={14} /> Reject
                                                                  </button>
                                                              </div>
                                                          ) : (
                                                              <button 
                                                                  className="cancel-request-btn-small"
                                                                  onClick={() => handleCancelRequest(pendingRequest.id)}
                                                              >
                                                                  <XCircle size={14} /> Cancel Request
                                                              </button>
                                                          )
                                                      ) : (
                                                          <div className="action-buttons-row">
                                                              <button 
                                                                  className="add-friend-btn-small"
                                                                  onClick={() => handleSendFriendRequest(u.id)}
                                                              >
                                                                  <UserPlus size={14} /> Add Friend
                                                              </button>
                                                              <button 
                                                                  className="block-btn-small danger"
                                                                  onClick={() => handleBlockUser(u.id)}
                                                                  title="Block User"
                                                              >
                                                                  <Ban size={14} /> Block
                                                              </button>
                                                          </div>
                                                      )}
                                                  </td>
                                              </tr>
                                          )
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      ) : globalSearchQuery && (
                          <div className="empty-state-small">No users found matching "{globalSearchQuery}"</div>
                      )}
                  </div>
              </div>
            )}
            
            {activeTab === 'friends' && (
              <div className="friends-tab-container">
                
                {pendingRequestsList.length > 0 && (
                  <div className="requests-section mb-4">
                    <h3 className="section-title">
                       Pending Requests
                       {isLoadingRequests && <span style={{fontSize: '0.8rem', marginLeft: '10px', color: '#6b7280'}}>Loading...</span>}
                    </h3>
                    <div className="users-grid requests-grid">
                      {pendingRequestsList.map((req) => (
                        <div key={req.id} className="user-card-item request-card">
                          <div className="user-card-avatar">
                            {req.user?.displayName ? req.user.displayName.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div className="user-card-info">
                            <h4>{req.user?.displayName}</h4>
                            <p>@{req.user?.username}</p>
                          </div>
                          
                          {req.isReceived ? (
                            <div className="request-actions">
                              <button 
                                className="accept-btn" 
                                onClick={() => handleAcceptRequest(req.id)}
                                title="Accept Request"
                              >
                                <Check size={18} />
                                <span className="sr-only">Accept</span>
                              </button>
                              <button 
                                className="reject-btn" 
                                onClick={() => handleRejectRequest(req.id)}
                                title="Reject Request"
                              >
                                <XCircle size={18} />
                                <span className="sr-only">Reject</span>
                              </button>
                            </div>
                          ) : (
                            <div className="request-actions-vertical">
                               <div className="request-status-badge mb-2">
                                 <Clock size={16} />
                                 <span>Request Sent</span>
                               </div>
                               <button 
                                 className="cancel-request-btn"
                                 onClick={() => handleCancelRequest(req.id)}
                                 title="Cancel Request"
                               >
                                 <Trash2 size={16} />
                                 <span>Cancel</span>
                               </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="friends-section">
                  <h3 className="section-title">My Friends</h3>
                  {isLoadingFriends ? (
                    <div className="loading-state bg-white">Loading friends...</div>
                  ) : (
                    <div className="users-grid">
                      {filteredFriends.length > 0 ? (
                        filteredFriends.map((u) => (
                          <div key={u.username} className="user-card-item">
                             <div className="user-card-avatar">
                                {u.displayName ? u.displayName.charAt(0).toUpperCase() : '?'}
                             </div>
                             <div className="user-card-info">
                                <h4>{u.displayName}</h4>
                                <p>@{u.username}</p>
                                <small>{u.email}</small>
                             </div>
                             
                             <div className="friend-card-actions">
                               <button className="message-btn">
                                  <MessageSquare size={16} />
                                  <span>Message</span>
                               </button>
                               
                               <div className="dropdown-container">
                                  <button 
                                     className="more-options-btn" 
                                     onClick={(e) => toggleDropdown(u.id, e)}
                                  >
                                     &#8942;
                                  </button>
                                  {activeDropdownMenu === u.id && (
                                     <div className="dropdown-menu">
                                        <button onClick={() => handleUnfriend(u.id)} className="dropdown-item">
                                           <UserMinus size={16} /> Unfriend
                                        </button>
                                        <button onClick={() => handleBlockUser(u.id)} className="dropdown-item danger">
                                           <Ban size={16} /> Block User
                                        </button>
                                     </div>
                                  )}
                               </div>
                             </div>
                          </div>
                        ))
                      ) : (
                        <div className="empty-state bg-white">
                            {friendsSearchQuery ? `No friends found matching "${friendsSearchQuery}"` : "You don't have any friends yet."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'messages' && (
              <div className="tab-content">
                <h3>Messages Content</h3>
                <p>Your conversations will appear here.</p>
              </div>
            )}
            
            {activeTab === 'status' && (
              <div className="tab-content">
                <h3>Status Content</h3>
                <p>View and update statuses here.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;