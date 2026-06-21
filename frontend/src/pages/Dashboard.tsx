import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Users, MessageSquare, Share2, Menu, X, UserPlus, Search, Check, XCircle, Clock, Trash2, UserMinus, Ban, Unlock, Send, Eye } from 'lucide-react';
import { 
  getMyFriends, getUsers, sendFriendRequest, getFriendRequests, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest, unfriendUser, blockUser, unblockUser, 
  connectWebSocket, disconnectWebSocket, addNotificationListener, removeNotificationListener, 
  getConversation, sendMessage, addMessageListener, removeMessageListener, getConversations,
  addReadReceiptListener, removeReadReceiptListener, sendReadReceipt
} from '../api';
import type { User, FriendRequest, Message as ChatMessage } from '../api';
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

  // Notification states
  const [hasNewAcceptedRequest, setHasNewAcceptedRequest] = useState(false);
  const [newMessageNotifications, setNewMessageNotifications] = useState<number[]>([]);

  // Chat states
  const [conversations, setConversations] = useState<User[]>([]);
  const [activeChatFriend, setActiveChatFriend] = useState<User | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const activeChatFriendRef = useRef(activeChatFriend);
  activeChatFriendRef.current = activeChatFriend;

  useEffect(() => {
    fetchRequestsGlobally();
    connectWebSocket();

    const handleFriendNotification = (notification: FriendRequest) => {
       if (notification.status === 'PENDING') {
           setFriendRequests(prev => prev.some(req => req.id === notification.id) ? prev : [...prev, notification]);
       } else if (notification.status === 'ACCEPTED' || notification.status === 'REJECTED') {
           fetchRequestsGlobally(true);
           if (activeTabRef.current === 'friends') fetchFriendsListOnly();
           else if (notification.status === 'ACCEPTED') setHasNewAcceptedRequest(true);
       } else if (notification.status === null || notification.status === 'BLOCKED') {
           setFriendRequests(prev => prev.filter(req => req.id !== notification.id));
       }
    };

    const handleMessageNotification = (message: ChatMessage) => {
        const isMyMessage = message.senderId === user.id;
        const chatPartnerId = isMyMessage ? message.receiverId : message.senderId;
        const isChattingWithPartner = activeChatFriendRef.current?.id === chatPartnerId && activeTabRef.current === 'messages';

        if (isChattingWithPartner) {
            setChatMessages(prev => [...prev, message]);
        } else if (!isMyMessage) {
            if (!newMessageNotifications.includes(message.senderId)) {
                setNewMessageNotifications(prev => [...prev, message.senderId]);
            }
        }
        
        setConversations(prev => {
            if (prev.some(c => c.id === chatPartnerId)) return prev;
            return [...prev, {id: chatPartnerId, username: 'New', displayName: 'Chat', email: ''}];
        });
    };

    const handleReadReceipt = (message: ChatMessage) => {
        setChatMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'READ', readAt: message.readAt } : m));
    };

    addNotificationListener(handleFriendNotification);
    addMessageListener(handleMessageNotification);
    addReadReceiptListener(handleReadReceipt);

    return () => {
       removeNotificationListener(handleFriendNotification);
       removeMessageListener(handleMessageNotification);
       removeReadReceiptListener(handleReadReceipt);
       disconnectWebSocket();
    };
  }, [user.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = Number(entry.target.getAttribute('data-message-id'));
            const messageSenderId = Number(entry.target.getAttribute('data-sender-id'));
            const messageStatus = entry.target.getAttribute('data-message-status');
            if (messageId && messageSenderId !== user.id && messageStatus !== 'READ') {
              sendReadReceipt(messageId);
            }
          }
        });
      },
      { root: chatContainerRef.current, threshold: 1.0 }
    );

    const messages = chatContainerRef.current?.querySelectorAll('.chat-bubble.theirs');
    if (messages) {
      messages.forEach((msg) => observer.observe(msg));
    }

    return () => observer.disconnect();
  }, [chatMessages, user.id]);

  useEffect(() => {
    if (activeTab === 'friends') {
      fetchFriendsListOnly();
      setHasNewAcceptedRequest(false);
    } else if (activeTab === 'messages') {
      fetchConversations();
      if (activeChatFriend) {
        setNewMessageNotifications(prev => prev.filter(id => id !== activeChatFriend.id));
      }
    }
  }, [activeTab, activeChatFriend]);

  useEffect(() => {
    if (friendsSearchQuery.trim() === '') setFilteredFriends(allFriends);
    else {
      const lowerQuery = friendsSearchQuery.toLowerCase();
      setFilteredFriends(allFriends.filter(u => 
        (u.username?.toLowerCase().includes(lowerQuery)) ||
        (u.displayName?.toLowerCase().includes(lowerQuery)) ||
        (u.email?.toLowerCase().includes(lowerQuery))
      ));
    }
  }, [friendsSearchQuery, allFriends]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdownMenu !== null && !(event.target as Element).closest('.dropdown-container')) {
        setActiveDropdownMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdownMenu]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleTabChange = (tab: string) => {
    navigate(`?tab=${tab}`, { replace: true });
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const fetchConversations = async () => {
    try {
      const response = await getConversations();
      setConversations(response.data);
    } catch (error) {
      console.error("Failed to fetch conversations", error);
    }
  };

  const fetchRequestsGlobally = async (isSilent = false) => {
    if (!isSilent) setIsLoadingRequests(true);
    try {
        const res = await getFriendRequests();
        const relevant = res.data.filter(req => req.status === 'PENDING' || req.status === 'REJECTED' || req.status === 'BLOCKED');
        setFriendRequests(prev => JSON.stringify(prev) !== JSON.stringify(relevant) ? relevant : prev);
    } catch (error) {
        console.error("Failed to fetch friend requests globally", error);
    } finally {
        if (!isSilent) setIsLoadingRequests(false);
    }
  };

  const fetchFriendsListOnly = async () => {
      setIsLoadingFriends(true);
      try {
          const res = await getMyFriends();
          setAllFriends(res.data);
          setFilteredFriends(res.data);
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
      alert("Failed to accept friend request.");
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await rejectFriendRequest(requestId);
      setFriendRequests(friendRequests.filter(req => req.id !== requestId));
    } catch (error) {
      alert("Failed to reject friend request.");
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    try {
      await cancelFriendRequest(requestId);
      setFriendRequests(friendRequests.filter(req => req.id !== requestId));
    } catch (error) {
      alert("Failed to cancel friend request.");
    }
  };

  const handleUnfriend = async (friendId: number | undefined) => {
    if (!friendId) return;
    if (window.confirm("Are you sure you want to unfriend this user?")) {
        try {
            await unfriendUser(friendId);
            setAllFriends(allFriends.filter(f => f.id !== friendId));
            if (activeChatFriend?.id === friendId) setActiveChatFriend(null);
        } catch (error) {
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
            if (activeChatFriend?.id === friendId) setActiveChatFriend(null);
            fetchRequestsGlobally();
        } catch (error) {
            alert("Failed to block user.");
        }
    }
  };

  const handleUnblockUser = async (userId: number | undefined) => {
      if (!userId) return;
      try {
          await unblockUser(userId);
          fetchRequestsGlobally();
      } catch (error) {
          alert("Failed to unblock user.");
      }
  };

  const handleConversationClick = async (friend: User) => {
    if (activeChatFriend?.id === friend.id) {
        handleTabChange('messages');
        return;
    }
    handleTabChange('messages');
    setActiveChatFriend(friend);
    setIsLoadingMessages(true);
    setChatMessages([]);
    try {
      if (friend.id) {
          const response = await getConversation(friend.id);
          setChatMessages(response.data.reverse());
          setNewMessageNotifications(prev => prev.filter(id => id !== friend.id));
      }
    } catch (error) {
      alert("Failed to load conversation.");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && activeChatFriend && user) {
        sendMessage({
            senderId: user.id,
            receiverId: activeChatFriend.id!,
            content: newMessage.trim(),
        });
        setNewMessage('');
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const toggleDropdown = (userId: number | undefined, event: React.MouseEvent) => {
      event.stopPropagation();
      if (userId !== undefined) setActiveDropdownMenu(activeDropdownMenu === userId ? null : userId);
  };

  const pendingRequestsList = friendRequests.filter(req => req.status === 'PENDING');
  const pendingReceivedCount = pendingRequestsList.filter(req => req.isReceived === true).length;

  const isUserBlockedByMe = (userId: number | undefined) => friendRequests.some(req => req.status === 'BLOCKED' && req.user.id === userId && !req.isReceived);
  
  const getPendingRequestWithUser = (userId: number | undefined) => friendRequests.find(req => req.status === 'PENDING' && req.user.id === userId);

  const renderContent = () => {
    const lastReadMessageId = chatMessages.length > 0 ? 
      chatMessages.slice().reverse().find(m => m.senderId === user.id && m.status === 'READ')?.id 
      : undefined;

    switch (activeTab) {
      case 'profiles':
        return (
          <div className="my-profile-container">
            <div className="tab-content current-user-profile">
              <div className="profile-header-large">
                 <div className="profile-avatar-large">{user?.displayName ? user.displayName.charAt(0).toUpperCase() : '?'}</div>
                 <div className="profile-info-large">
                    <h3>{user?.displayName || 'Your Name'}</h3>
                    <p className="profile-username">@{user?.username || 'username'}</p>
                 </div>
              </div>
              <div className="profile-details">
                 <div className="detail-group"><label>Email Address</label><p>{user?.email || 'No email'}</p></div>
                 <div className="detail-group"><label>Bio</label><p>{user?.bio || 'No bio.'}</p></div>
              </div>
            </div>
            <div className="find-users-section tab-content">
              <h3>Find New Friends</h3>
              <div className="search-container global-search-container">
                <Search size={18} className="search-icon" />
                <input type="text" placeholder="Search users globally..." value={globalSearchQuery} onChange={(e) => setGlobalSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()} className="search-input" />
                <button onClick={handleGlobalSearch} className="search-btn">Search</button>
              </div>
              {isSearchingGlobal ? <div className="loading-state">Searching...</div> : filteredGlobalUsers.length > 0 ? (
                <div className="table-responsive">
                  <table className="users-table">
                    <thead><tr><th>User</th><th>Email</th><th>Action</th></tr></thead>
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
                              {isUserBlockedByMe(u.id) ? <button className="unblock-btn-small" onClick={() => handleUnblockUser(u.id)}><Unlock size={14} /> Unblock</button> : pendingRequest ? (
                                pendingRequest.isReceived ? (
                                  <div className="action-buttons-row">
                                    <button className="accept-btn-small" onClick={() => handleAcceptRequest(pendingRequest.id)}><Check size={14} /> Accept</button>
                                    <button className="reject-btn-small danger" onClick={() => handleRejectRequest(pendingRequest.id)}><XCircle size={14} /> Reject</button>
                                  </div>
                                ) : <button className="cancel-request-btn-small" onClick={() => handleCancelRequest(pendingRequest.id)}><XCircle size={14} /> Cancel Request</button>
                              ) : (
                                <div className="action-buttons-row">
                                  <button className="add-friend-btn-small" onClick={() => handleSendFriendRequest(u.id)}><UserPlus size={14} /> Add Friend</button>
                                  <button className="block-btn-small danger" onClick={() => handleBlockUser(u.id)} title="Block User"><Ban size={14} /> Block</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : globalSearchQuery && <div className="empty-state-small">No users found.</div>}
            </div>
          </div>
        );
      case 'friends':
        return (
          <div className="friends-tab-container">
            {pendingRequestsList.length > 0 && (
              <div className="requests-section mb-4">
                <h3 className="section-title">Pending Requests {isLoadingRequests && <span className="loading-text">Loading...</span>}</h3>
                <div className="users-grid requests-grid">
                  {pendingRequestsList.map((req) => (
                    <div key={req.id} className="user-card-item request-card">
                      <div className="user-card-avatar">{req.user?.displayName ? req.user.displayName.charAt(0).toUpperCase() : '?'}</div>
                      <div className="user-card-info"><h4>{req.user?.displayName}</h4><p>@{req.user?.username}</p></div>
                      {req.isReceived ? (
                        <div className="request-actions">
                          <button className="accept-btn" onClick={() => handleAcceptRequest(req.id)} title="Accept"><Check size={18} /><span className="sr-only">Accept</span></button>
                          <button className="reject-btn" onClick={() => handleRejectRequest(req.id)} title="Reject"><XCircle size={18} /><span className="sr-only">Reject</span></button>
                        </div>
                      ) : (
                        <div className="request-actions-vertical">
                           <div className="request-status-badge mb-2"><Clock size={16} /><span>Request Sent</span></div>
                           <button className="cancel-request-btn" onClick={() => handleCancelRequest(req.id)} title="Cancel"><Trash2 size={16} /><span>Cancel</span></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="friends-section">
              <h3 className="section-title">My Friends</h3>
              {isLoadingFriends ? <div className="loading-state bg-white">Loading...</div> : (
                <div className="users-grid">
                  {filteredFriends.length > 0 ? filteredFriends.map((u) => (
                    <div key={u.username} className="user-card-item">
                       <div className="user-card-avatar">{u.displayName ? u.displayName.charAt(0).toUpperCase() : '?'}</div>
                       <div className="user-card-info"><h4>{u.displayName}</h4><p>@{u.username}</p><small>{u.email}</small></div>
                       <div className="friend-card-actions">
                         <button className="message-btn" onClick={() => handleConversationClick(u)}><MessageSquare size={16} /><span>Message</span></button>
                         <div className="dropdown-container">
                            <button className="more-options-btn" onClick={(e) => toggleDropdown(u.id, e)}>&#8942;</button>
                            {activeDropdownMenu === u.id && (
                               <div className="dropdown-menu">
                                  <button onClick={() => handleUnfriend(u.id)} className="dropdown-item"><UserMinus size={16} /> Unfriend</button>
                                  <button onClick={() => handleBlockUser(u.id)} className="dropdown-item danger"><Ban size={16} /> Block</button>
                               </div>
                            )}
                         </div>
                       </div>
                    </div>
                  )) : <div className="empty-state bg-white">{friendsSearchQuery ? "No friends found." : "You have no friends yet."}</div>}
                </div>
              )}
            </div>
          </div>
        );
      case 'messages':
        return (
          <div className="messages-layout">
            <div className={`conversation-list ${activeChatFriend ? 'mobile-hidden' : ''}`}>
              {conversations.map(c => (
                <div key={c.id} className={`conversation-item ${activeChatFriend?.id === c.id ? 'active' : ''}`} onClick={() => handleConversationClick(c)}>
                  <div className="user-card-avatar">{c.displayName ? c.displayName.charAt(0).toUpperCase() : '?'}</div>
                  <div className="conversation-details"><h4>{c.displayName}</h4><p>@{c.username}</p></div>
                  {newMessageNotifications.includes(c.id!) && <span className="new-message-dot"></span>}
                </div>
              ))}
            </div>
            <div className={`chat-container ${!activeChatFriend ? 'mobile-hidden' : ''}`} ref={chatContainerRef}>
              {activeChatFriend ? (
                <>
                  <div className="chat-header">
                     <button className="back-btn mobile-only" onClick={() => setActiveChatFriend(null)}><X size={20} /></button>
                     <div className="user-card-avatar">{activeChatFriend.displayName ? activeChatFriend.displayName.charAt(0).toUpperCase() : '?'}</div>
                     <div><h3>{activeChatFriend.displayName}</h3><small>@{activeChatFriend.username}</small></div>
                  </div>
                  <div className="chat-messages">
                     {isLoadingMessages ? <div className="loading-state">Loading...</div> : 
                       chatMessages.length > 0 ? chatMessages.map((msg) => (
                           <div key={msg.id} className={`chat-bubble-wrapper ${msg.senderId === user?.id ? 'mine' : 'theirs'}`}>
                               <div 
                                   className={`chat-bubble ${msg.senderId === user?.id ? 'mine' : 'theirs'}`}
                                   data-message-id={msg.id}
                                   data-sender-id={msg.senderId}
                                   data-message-status={msg.status}
                               >
                                   {msg.content}
                               </div>
                               {msg.senderId === user?.id && msg.id === lastReadMessageId && (
                                   <div className="read-receipt">
                                       <Eye size={14} /> 
                                       Seen {msg.readAt ? `at ${new Date(msg.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                   </div>
                               )}
                           </div>
                       )) : <div className="empty-state">No messages yet.</div>
                     }
                     <div ref={messagesEndRef} />
                  </div>
                  <div className="chat-input-area">
                      <input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
                      <button onClick={handleSendMessage}><Send size={18} /><span>Send</span></button>
                  </div>
                </>
              ) : <div className="empty-state-center">Select a conversation.</div>}
            </div>
          </div>
        );
      case 'status':
        return <div className="tab-content"><h3>Status</h3><p>Status updates will appear here.</p></div>;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="mobile-header">
        <button onClick={toggleSidebar} className="menu-btn"><Menu size={24} /></button>
        <h1>ChatApp</h1>
        <button onClick={onLogout} className="logout-btn-mobile" title="Logout"><LogOut size={20} /></button>
      </div>

      <div className="dashboard-body">
        <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2>ChatApp</h2>
            <button onClick={toggleSidebar} className="close-btn mobile-only"><X size={24} /></button>
          </div>
          <div className="mobile-profile-section mobile-only">
             <div className="user-info-mobile">
                <span className="user-name">{user?.displayName || 'User'}</span>
                <span className="user-username">@{user?.username || 'username'}</span>
             </div>
          </div>
          <nav className="sidebar-nav">
            <button className={`nav-item ${activeTab === 'profiles' ? 'active' : ''}`} onClick={() => handleTabChange('profiles')}>
              <div className="nav-item-content"><Users size={20} /><span>My Profile</span></div>
            </button>
            <button className={`nav-item ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => handleTabChange('friends')}>
              <div className="nav-item-content"><UserPlus size={20} /><span>Friends</span></div>
              {(pendingReceivedCount > 0 || hasNewAcceptedRequest) && <span className="badge">{pendingReceivedCount > 0 ? pendingReceivedCount : "1"}</span>}
            </button>
            <button className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => handleTabChange('messages')}>
              <div className="nav-item-content"><MessageSquare size={20} /><span>Messages</span></div>
              {newMessageNotifications.length > 0 && <span className="badge">{newMessageNotifications.length}</span>}
            </button>
            <button className={`nav-item ${activeTab === 'status' ? 'active' : ''}`} onClick={() => handleTabChange('status')}>
              <div className="nav-item-content"><Share2 size={20} /><span>Status</span></div>
            </button>
          </nav>
        </aside>

        {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

        <div className="dashboard-main-area">
          <header className="dashboard-header desktop-only">
            <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
            {activeTab === 'friends' && (
              <div className="search-container desktop-search">
                <Search size={18} className="search-icon" />
                <input type="text" placeholder="Search friends..." value={friendsSearchQuery} onChange={(e) => setFriendsSearchQuery(e.target.value)} className="search-input" />
              </div>
            )}
            <div className="user-profile">
              <div className="user-info">
                <span className="user-name">{user?.displayName || 'User'}</span>
                <span className="user-username">@{user?.username || 'username'}</span>
              </div>
              <button onClick={onLogout} className="logout-btn-dashboard" title="Logout"><LogOut size={20} /><span className="logout-text">Logout</span></button>
            </div>
          </header>

          <main className="dashboard-main-content">
            <h2 className="mobile-only page-title-mobile">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;