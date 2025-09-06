import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

// Configure axios base URL
axios.defaults.baseURL = 'http://localhost:5000';

// Custom Modal Component
const Modal = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="relative p-8 w-96 mx-auto bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmation</h3>
          <p className="text-sm text-gray-500 mb-6">{message}</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Confirm
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await axios.get('/api/auth/profile');
      setUser(response.data);
    } catch (error) {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchProfile();
    }
  }, [token, fetchProfile]);

  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// Cart Context
const CartContext = createContext();

const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart }}>
      {children}
    </CartContext.Provider>
  );
};

const useCart = () => useContext(CartContext);

// Components
const Header = () => {
  const { user, logout } = useAuth();
  const { cartItems } = useCart();
  const navigate = useNavigate();

  return (
    <header className="bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg fixed top-0 left-0 w-full z-10">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold font-display tracking-wide">
          🌱 EcoFinds
        </Link>
        <nav className="flex items-center space-x-4">
          {user ? (
            <>
              <span className="hidden sm:inline text-sm font-medium">Hi, {user.username}!</span>
              <Link to="/dashboard" className="hover:text-green-100 transition-colors">Dashboard</Link>
              <Link to="/cart" className="relative hover:text-green-100 transition-colors">
                Cart
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-bounce-once">
                    {cartItems.length}
                  </span>
                )}
              </Link>
              <button
                onClick={logout}
                className="hover:text-green-100 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-green-100 transition-colors">Login</Link>
              <Link to="/register" className="bg-white text-green-600 font-medium px-4 py-2 rounded-full shadow-md hover:bg-gray-100 transition-colors">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

const ProductCard = ({ product, showManagementButtons }) => {
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();

  return (
    <div
      className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <img
        src={product.image}
        alt={product.title}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 truncate">{product.title}</h3>
        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description.substring(0, 100)}...</p>
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold text-green-600">₹{product.price}</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {product.category}
          </span>
        </div>
      </div>
    </div>
  );
};

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const navigate = useNavigate();

  const categories = ['all', 'electronics', 'clothing', 'books', 'furniture', 'sports', 'other'];

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/products', {
        params: {
          search: searchTerm,
          category: selectedCategory
        }
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="min-h-screen pt-20 bg-gray-50">
      <div className="container mx-auto px-4 py-8 relative">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-800 mb-4">
            Discover Your Next Treasure
          </h1>
          <p className="text-lg text-gray-600">Buy and sell pre-loved goods to support a sustainable lifestyle.</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search products..."
              className="flex-1 px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-xl text-gray-600">Loading products...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.length > 0 ? (
              products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <div className="text-gray-500">No products found</div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => navigate('/add-product')}
          className="fixed bottom-8 right-8 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-colors transform hover:scale-110"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/login', { email, password });
      login(response.data.user, response.data.token);
      navigate('/');
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to EcoFinds
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-green-600 hover:text-green-500">
                Sign up
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/register', { username, email, password });
      login(response.data.user, response.data.token);
      navigate('/');
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-green-600 hover:text-green-500">
                Sign in
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddProduct = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('electronics');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const categories = ['electronics', 'clothing', 'books', 'furniture', 'sports', 'other'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post('/api/products', {
        title,
        description,
        category,
        price: parseFloat(price)
      });
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg">
        <div className="mb-6">
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Add New Product
          </h2>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Product Title
            </label>
            <input
              id="title"
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows="4"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Price (₹)
            </label>
            <input
              id="price"
              type="number"
              step="0.01"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? 'Adding Product...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchMyProducts = useCallback(async () => {
    try {
      const response = await axios.get('/api/products/my-listings');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyProducts();
  }, [fetchMyProducts]);

  const handleDeleteClick = (id) => {
    setProductToDelete(id);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`/api/products/${productToDelete}`);
      fetchMyProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    } finally {
      setIsModalOpen(false);
      setProductToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsModalOpen(false);
    setProductToDelete(null);
  };

  return (
    <div className="min-h-screen pt-20 bg-gray-50">
      {isModalOpen && (
        <Modal
          message="Are you sure you want to delete this product? This action cannot be undone."
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <button
            onClick={() => navigate('/add-product')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            + Add New Product
          </button>
        </div>

        <div className="mb-8 bg-white overflow-hidden shadow-lg rounded-xl">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-4">Welcome back, {user?.username}!</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-6 rounded-lg text-center shadow-inner">
                <div className="text-3xl font-bold text-green-600">{products.length}</div>
                <div className="text-gray-600 mt-1">Active Listings</div>
              </div>
              <div className="bg-blue-50 p-6 rounded-lg text-center shadow-inner">
                <div className="text-3xl font-bold text-blue-600">0</div>
                <div className="text-gray-600 mt-1">Items Sold</div>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg text-center shadow-inner">
                <div className="text-3xl font-bold text-purple-600">₹0</div>
                <div className="text-gray-600 mt-1">Total Earnings</div>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-6">My Listings</h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-xl text-gray-600">Loading your products...</div>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => (
              <div key={product.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{product.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">{product.description.substring(0, 100)}...</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-bold text-green-600">₹{product.price}</span>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {product.category}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteClick(product.id)}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">No products listed yet</div>
            <button
              onClick={() => navigate('/add-product')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Add Your First Product
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const fetchProduct = useCallback(async () => {
    try {
      const response = await axios.get(`/api/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading product...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-4">Product not found</div>
          <button
            onClick={() => navigate('/')}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/')}
          className="mb-6 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          ← Back to Products
        </button>

        <div className="bg-white overflow-hidden shadow-lg rounded-xl">
          <div className="md:flex">
            <div className="md:w-1/2">
              <img
                src={product.image}
                alt={product.title}
                className="w-full h-96 object-cover"
              />
            </div>
            <div className="md:w-1/2 p-8">
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {product.category}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.title}</h1>
              <p className="text-gray-700 mb-6">{product.description}</p>
              <div className="text-3xl font-bold text-green-600 mb-6">₹{product.price}</div>
              <div className="flex space-x-4 mb-6">
                <button className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  Contact Seller
                </button>
                <button
                  onClick={() => addToCart(product)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Add to Cart
                </button>
              </div>
              <div className="text-sm text-gray-500">
                Listed on {new Date(product.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Cart = () => {
  const { cartItems, removeFromCart } = useCart();
  const navigate = useNavigate();

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen pt-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Your Cart</h1>
        {cartItems.length > 0 ? (
          <>
            <div className="bg-white shadow-lg overflow-hidden rounded-xl mb-8">
              <ul className="divide-y divide-gray-200">
                {cartItems.map(item => (
                  <li key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                      <img src={item.image} alt={item.title} className="h-16 w-16 object-cover rounded-md mr-4" />
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-500">Price: ₹{item.price}</p>
                        <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600 hover:text-red-800 font-medium transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center font-bold text-2xl text-gray-800 mb-8">
              Total: ₹{total.toFixed(2)}
            </div>
            <div className="text-center">
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">Your cart is empty.</div>
            <button
              onClick={() => navigate('/')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Start Shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const PreviousPurchase = () => {
  const navigate = useNavigate();
  // Placeholder data for previous purchases
  const purchasedItems = [
    {
      id: "1",
      title: "Vintage Leather Jacket",
      price: 1500,
      image: "https://placehold.co/400x300/E2E8F0/A0AEC0?text=Jacket",
      date: "2023-10-25"
    },
    {
      id: "2",
      title: "Antique Bookshelf",
      price: 4500,
      image: "https://placehold.co/400x300/E2E8F0/A0AEC0?text=Bookshelf",
      date: "2023-09-15"
    },
  ];

  return (
    <div className="min-h-screen pt-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Previous Purchases</h1>
        {purchasedItems.length > 0 ? (
          <div className="bg-white shadow-lg overflow-hidden rounded-xl">
            <ul className="divide-y divide-gray-200">
              {purchasedItems.map(item => (
                <li key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <img src={item.image} alt={item.title} className="h-16 w-16 object-cover rounded-md mr-4" />
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-500">Price: ₹{item.price}</p>
                      <p className="text-sm text-gray-500">Purchased on: {item.date}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">You have no past purchases.</div>
            <button
              onClick={() => navigate('/')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Start Shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

// Main App Component
const App = () => {
  return (
    <CartProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-100">
            <Header />
            <main>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/add-product"
                  element={
                    <ProtectedRoute>
                      <AddProduct />
                    </ProtectedRoute>
                  }
                />
                <Route path="/cart" element={<Cart />} />
                <Route path="/previous-purchases" element={<PreviousPurchase />} />
              </Routes>
            </main>
          </div>
        </Router>
      </AuthProvider>
    </CartProvider>
  );
};

export default App;
