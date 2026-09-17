import React, { useEffect, useMemo, useState } from 'react'
import { LayoutDashboard, Package, ShoppingCart, Truck, Users, Receipt, Wallet, BarChart3, Settings, Search, Bell, Plus, Menu, X, RefreshCw, Trash2, Edit3, AlertTriangle, LogOut, Download, UserCog, ShieldCheck } from 'lucide-react'
import { supabase } from './lib/supabase'
import './index.css'

const nav = [
  ['Dashboard', LayoutDashboard], ['Products', Package], ['Inventory', Package],
  ['Purchase', Truck], ['Sales / Billing', Receipt], ['Customers', Users],
  ['Suppliers', Truck], ['Payments', Wallet], ['Expenses', Wallet], ['Returns', RefreshCw], ['Reports', BarChart3], ['Settings', Settings]
]
const units = ['g','kg','ml','L']
const packs = [50,100,250,500,1,2,5,10,25,40,50]

export default function App() {
  const [session,setSession]=useState(null)
  const [authLoading,setAuthLoading]=useState(true)
  const [active, setActive] = useState('Dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [products, setProducts] = useState([])
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(false)
  const [showProduct, setShowProduct] = useState(false)
  const [showSupplier, setShowSupplier] = useState(false)
  const [showPurchase, setShowPurchase] = useState(false)
  const [suppliers, setSuppliers] = useState([])
  const [customers, setCustomers] = useState([])
  const [showCustomer, setShowCustomer] = useState(false)
  const [showSale, setShowSale] = useState(false)
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [showPayment, setShowPayment] = useState(false)
  const [showExpense, setShowExpense] = useState(false)

  useEffect(()=>{
    if(!supabase){setAuthLoading(false);return}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthLoading(false)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next))
    return ()=>subscription.unsubscribe()
  },[])

  async function loadData() {
    if (!supabase || !session) return
    setLoading(true)
    const [{data:p}, {data:s}, {data:sp}, {data:sp2}, {data:pay}, {data:exp}] = await Promise.all([
      supabase.from('products').select('*').order('created_at',{ascending:false}),
      supabase.from('stock').select('*, products(product_name,pack_size,unit)').order('updated_at',{ascending:false}),
      supabase.from('suppliers').select('*').order('supplier_name'),
      supabase.from('customers').select('*').order('customer_name'),
      supabase.from('payments').select('*').order('payment_date',{ascending:false}),
      supabase.from('expenses').select('*').order('expense_date',{ascending:false})
    ])
    setProducts(p || []); setStock(s || []); setSuppliers(sp || []); setCustomers(sp2 || []); setPayments(pay || []); setExpenses(exp || []); setLoading(false)
  }
  useEffect(()=>{ if(session) loadData() }, [session])

  const totalStock = useMemo(()=>stock.reduce((n,x)=>n + Number(x.quantity || 0),0),[stock])
  const lowStock = products.filter(p => {
    const q = stock.filter(s=>s.product_id===p.id).reduce((n,s)=>n+Number(s.quantity||0),0)
    return q <= Number(p.minimum_stock||0)
  })

  if(authLoading) return <div className="authScreen"><div className="authCard"><div className="logo big">F</div><h1>Fertilizer ERP</h1><p>Loading secure workspace…</p></div></div>
  if(!supabase) return <AuthScreen configured={false}/>
  if(!session) return <AuthScreen configured={true}/>
  return <div className="app">
    <aside className={`sidebar ${mobileOpen?'open':''}`}>
      <div className="brand"><div className="logo">F</div><div><strong>Fertilizer ERP</strong><span>Business Management</span></div><button className="close" onClick={()=>setMobileOpen(false)}><X/></button></div>
      <nav>{nav.map(([label,Icon])=><button key={label} className={`nav ${active===label?'active':''}`} onClick={()=>{setActive(label);setMobileOpen(false)}}><Icon size={19}/><span>{label}</span></button>)}</nav>
      <button className={`nav settings ${active==='Settings'?'active':''}`} onClick={()=>{setActive('Settings');setMobileOpen(false)}}><Settings size={19}/><span>Settings</span></button>
    </aside>
    {mobileOpen && <div className="overlay" onClick={()=>setMobileOpen(false)}/>}
    <main className="main">
      <header><button className="menu" onClick={()=>setMobileOpen(true)}><Menu/></button><div className="search"><Search size={18}/><input placeholder="Search products, invoices, customers..."/></div><button className="iconbtn"><Bell size={19}/></button><div className="avatar">{(session.user.email||'AD').slice(0,2).toUpperCase()}</div><button className="logoutBtn" title="Sign out" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/></button></header>
      <section className="content">
        <div className="titleRow"><div><p className="eyebrow">{active==='Dashboard'?'OVERVIEW':'MANAGEMENT'}</p><h1>{active}</h1><p className="muted">Manage your fertilizer business from one place.</p></div>
        {active==='Products' && <button className="primary" onClick={()=>setShowProduct(true)}><Plus size={18}/> Add Product</button>}
         {active==='Inventory' && <button className="secondary" onClick={loadData}><RefreshCw size={17}/> Refresh</button>}
        {active==='Suppliers' && <button className="primary" onClick={()=>setShowSupplier(true)}><Plus size={18}/> Add Supplier</button>}
        {active==='Customers' && <button className="primary" onClick={()=>setShowCustomer(true)}><Plus size={18}/> Add Customer</button>}
        {active==='Sales / Billing' && <button className="primary" onClick={()=>setShowSale(true)}><Plus size={18}/> New Bill</button>}
        {active==='Payments' && <button className="primary" onClick={()=>setShowPayment(true)}><Plus size={18}/> Record Payment</button>}
        {active==='Expenses' && <button className="primary" onClick={()=>setShowExpense(true)}><Plus size={18}/> Add Expense</button>}
        {active==='Purchase' && <button className="primary" onClick={()=>setShowPurchase(true)}><Plus size={18}/> New Purchase</button>}
        {active==='Returns' && <span className="count">Sales return ↑ stock · Purchase return ↓ stock</span> }
        </div>
        {!supabase && <div className="warning"><AlertTriangle size={18}/><span>Supabase is not connected yet. Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.</span></div>}
        {active==='Dashboard' && <Dashboard products={products} stock={stock} totalStock={totalStock} lowStock={lowStock}/>}
        {active==='Products' && <Products products={products} stock={stock} reload={loadData} onAdd={()=>setShowProduct(true)}/>}
        {active==='Inventory' && <Inventory stock={stock} products={products} reload={loadData}/>}
        {active==='Suppliers' && <Suppliers suppliers={suppliers} reload={loadData}/>}
        {active==='Purchase' && <Purchase suppliers={suppliers} products={products} stock={stock} reload={loadData}/>}
        {active==='Customers' && <Customers customers={customers} reload={loadData}/>}
        {active==='Sales / Billing' && <Sales products={products} customers={customers} stock={stock} reload={loadData}/>}
        {active==='Payments' && <PaymentsView payments={payments} customers={customers} suppliers={suppliers}/>}
        {active==='Expenses' && <ExpensesView expenses={expenses} reload={loadData}/>}
        {active==='Returns' && <Returns products={products} customers={customers} suppliers={suppliers} stock={stock} reload={loadData}/>}
        {active==='Reports' && <ReportsView products={products} stock={stock} payments={payments} expenses={expenses} suppliers={suppliers} customers={customers}/>}
        {active==='Settings' && <SettingsView products={products} stock={stock} suppliers={suppliers} customers={customers} payments={payments} expenses={expenses}/>}
        {!['Dashboard','Products','Inventory','Suppliers','Purchase','Customers','Sales / Billing','Payments','Expenses','Returns','Reports','Settings'].includes(active) && <Module name={active}/>}
      </section>
    </main>
    {showProduct && <ProductModal close={()=>setShowProduct(false)} reload={loadData}/>}
    {showSupplier && <SupplierModal close={()=>setShowSupplier(false)} reload={loadData}/>}
    {showPurchase && <PurchaseModal suppliers={suppliers} products={products} close={()=>setShowPurchase(false)} reload={loadData}/>}
    {showCustomer && <CustomerModal close={()=>setShowCustomer(false)} reload={loadData}/>}
    {showSale && <SaleModal products={products} customers={customers} stock={stock} close={()=>setShowSale(false)} reload={loadData}/>}
    {showPayment && <PaymentModal customers={customers} suppliers={suppliers} close={()=>setShowPayment(false)} reload={loadData}/>}
    {showExpense && <ExpenseModal close={()=>setShowExpense(false)} reload={loadData}/>}
  </div>
}


function AuthScreen({configured}) {
  const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[loading,setLoading]=useState(false)
  async function submit(e){e.preventDefault();if(!configured)return;setLoading(true)
    const result=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password})
    setLoading(false)
    if(result.error) alert(result.error.message)
    else if(mode==='signup') alert('Account created. If email confirmation is enabled, verify your email before login.')
  }
  return <div className="authScreen"><div className="authCard"><div className="logo big">F</div><h1>Fertilizer ERP</h1><p className="muted">{configured?'Secure business workspace':'Connect Supabase to start'}</p>
    {!configured?<div className="warning"><AlertTriangle size={18}/><span>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify environment variables.</span></div>:
    <form onSubmit={submit}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com"/></label><label>Password<input type="password" required minLength="6" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label><button className="primary authBtn" disabled={loading}>{loading?'Please wait…':mode==='login'?'Sign In':'Create Account'}</button><button type="button" className="linkBtn" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Create a new account':'Back to sign in'}</button></form>}
  </div></div>
}

function ExportBackup({products,stock,suppliers,customers,payments,expenses}) {
  function download(){
    const payload={exported_at:new Date().toISOString(),products,stock,suppliers,customers,payments,expenses}
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`fertilizer-erp-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)
  }
  return <button className="secondary" onClick={download}><Download size={16}/> Export Data Backup</button>
}

function Dashboard({products,stock,totalStock,lowStock}) {
  const stockValue = stock.reduce((n,s)=>n+Number(s.quantity||0)*Number(s.products?.pack_size||0),0)
  return <><div className="cards">
    <div className="card"><span>Products</span><strong>{products.length}</strong><small>Active product master</small></div>
    <div className="card"><span>Stock Lines</span><strong>{stock.length}</strong><small>Batch records</small></div>
    <div className="card"><span>Total Quantity</span><strong>{totalStock.toLocaleString()}</strong><small>Pack units recorded</small></div>
    <div className="card"><span>Low Stock</span><strong>{lowStock.length}</strong><small>Needs attention</small></div>
  </div>
  <div className="grid2"><div className="panel"><div className="panelHead"><h2>Quick Actions</h2></div><div className="actions"><button><Plus/> New Sale</button><button><Plus/> New Purchase</button><button><Package/> Add Product</button><button><Users/> Add Customer</button></div></div>
  <div className="panel"><div className="panelHead"><h2>Inventory Value Basis</h2></div><div className="metric">₹ {stockValue.toLocaleString(undefined,{maximumFractionDigits:2})}</div><div className="empty">Current quantity × pack size. Purchase/sales valuation will be finalized with transaction modules.</div></div></div>
  <div className="panel tablePanel"><div className="panelHead"><h2>Stock Alerts</h2></div>{lowStock.length?<div className="alertList">{lowStock.map(p=><div className="alert" key={p.id}><AlertTriangle size={17}/><span>{p.product_name} is at or below minimum stock.</span></div>)}</div>:<div className="empty">No low-stock alerts.</div>}</div></>
}

function Products({products,stock,reload}) {
  const [editing,setEditing]=useState(null)
  async function remove(id) {
    if(!supabase || !confirm('Delete this product and its stock records?')) return
    await supabase.from('products').delete().eq('id',id); reload()
  }
  return <div className="panel"><div className="panelHead"><h2>Product Master</h2><span className="count">{products.length} products</span></div>
    <div className="tableWrap"><table><thead><tr><th>Product</th><th>Category</th><th>Pack</th><th>Purchase</th><th>Sale</th><th>GST</th><th>Min Stock</th><th></th></tr></thead>
    <tbody>{products.length?products.map(p=><tr key={p.id}><td><strong>{p.product_name}</strong><small>{p.brand||'—'}</small></td><td>{p.category}</td><td>{p.pack_size} {p.unit}</td><td>₹{Number(p.purchase_rate).toFixed(2)}</td><td>₹{Number(p.selling_rate).toFixed(2)}</td><td>{p.gst_percent}%</td><td>{p.minimum_stock}</td><td className="rowActions"><button onClick={()=>setEditing(p)}><Edit3/></button><button onClick={()=>remove(p.id)}><Trash2/></button></td></tr>):<tr><td colSpan="8" className="empty">No products yet. Add your first fertilizer product.</td></tr>}</tbody></table></div>
    {editing && <ProductModal product={editing} close={()=>setEditing(null)} reload={()=>{setEditing(null);reload()}}/>}
  </div>
}

function Inventory({stock,reload}) {
  const [show,setShow]=useState(false)
  return <div><div className="panel"><div className="panelHead"><div><h2>Inventory / Batch Stock</h2><span className="count">{stock.length} batches</span></div><button className="primary" onClick={()=>setShow(true)}><Plus size={17}/> Stock Adjustment</button></div>
    <div className="tableWrap"><table><thead><tr><th>Product</th><th>Batch</th><th>Pack</th><th>Quantity</th><th>Expiry</th><th>Updated</th></tr></thead><tbody>
    {stock.length?stock.map(s=><tr key={s.id}><td><strong>{s.products?.product_name}</strong></td><td>{s.batch_no}</td><td>{s.products?.pack_size} {s.products?.unit}</td><td>{s.quantity}</td><td>{s.expiry_date||'—'}</td><td>{new Date(s.updated_at).toLocaleDateString()}</td></tr>):<tr><td colSpan="6" className="empty">No stock batches yet. Purchases will create stock automatically.</td></tr>}
    </tbody></table></div></div>{show&&<StockAdjustmentModal stock={stock} close={()=>setShow(false)} reload={reload}/>}</div>
}

function ProductModal({product,close,reload}) {
  const [form,setForm]=useState(product||{product_name:'',brand:'',category:'Fertilizer',pack_size:50,unit:'g',purchase_rate:0,selling_rate:0,gst_percent:0,minimum_stock:0,status:'active'})
  const [saving,setSaving]=useState(false)
  const change=(k,v)=>setForm(f=>({...f,[k]:v}))
  async function save(e){e.preventDefault();if(!supabase)return;setSaving(true)
    const payload={...form,pack_size:Number(form.pack_size),purchase_rate:Number(form.purchase_rate),selling_rate:Number(form.selling_rate),gst_percent:Number(form.gst_percent),minimum_stock:Number(form.minimum_stock)}
    if(product) await supabase.from('products').update(payload).eq('id',product.id)
    else await supabase.from('products').insert(payload)
    setSaving(false);reload()
  }
  return <div className="modalBack"><div className="modal"><div className="modalHead"><div><h2>{product?'Edit Product':'Add Product'}</h2><span>Product Master</span></div><button onClick={close}><X/></button></div>
    <form onSubmit={save}><div className="formGrid">
      <label>Product Name<input required value={form.product_name} onChange={e=>change('product_name',e.target.value)}/></label>
      <label>Brand / Company<input value={form.brand} onChange={e=>change('brand',e.target.value)}/></label>
      <label>Category<select value={form.category} onChange={e=>change('category',e.target.value)}>{['Fertilizer','Micronutrient','Pesticide','Insecticide','Fungicide','Herbicide','Seed','PGR','Other'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Pack Size<select value={form.pack_size} onChange={e=>change('pack_size',e.target.value)}>{packs.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      <label>Unit<select value={form.unit} onChange={e=>change('unit',e.target.value)}>{units.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Purchase Rate<input type="number" min="0" step="0.01" value={form.purchase_rate} onChange={e=>change('purchase_rate',e.target.value)}/></label>
      <label>Selling Rate<input type="number" min="0" step="0.01" value={form.selling_rate} onChange={e=>change('selling_rate',e.target.value)}/></label>
      <label>GST %<input type="number" min="0" step="0.01" value={form.gst_percent} onChange={e=>change('gst_percent',e.target.value)}/></label>
      <label>Minimum Stock<input type="number" min="0" step="0.001" value={form.minimum_stock} onChange={e=>change('minimum_stock',e.target.value)}/></label>
    </div><div className="modalFoot"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving...':'Save Product'}</button></div></form>
  </div></div>
}


function Suppliers({suppliers,reload}) {
  async function remove(id){if(!supabase||!confirm('Delete supplier?'))return;await supabase.from('suppliers').delete().eq('id',id);reload()}
  return <div className="panel"><div className="panelHead"><h2>Supplier Master</h2><span className="count">{suppliers.length} suppliers</span></div>
  <div className="tableWrap"><table><thead><tr><th>Supplier</th><th>Mobile</th><th>GSTIN</th><th>Opening Balance</th><th></th></tr></thead><tbody>
  {suppliers.length?suppliers.map(s=><tr key={s.id}><td><strong>{s.supplier_name}</strong><small>{s.address||'—'}</small></td><td>{s.mobile||'—'}</td><td>{s.gstin||'—'}</td><td>₹{Number(s.opening_balance||0).toFixed(2)}</td><td className="rowActions"><button onClick={()=>remove(s.id)}><Trash2/></button></td></tr>):<tr><td colSpan="5" className="empty">No suppliers yet.</td></tr>}</tbody></table></div></div>
}
function SupplierModal({close,reload}) {
  const [f,setF]=useState({supplier_name:'',mobile:'',address:'',gstin:'',opening_balance:0})
  const [saving,setSaving]=useState(false); const c=(k,v)=>setF(x=>({...x,[k]:v}))
  async function save(e){e.preventDefault();if(!supabase)return;setSaving(true);await supabase.from('suppliers').insert({...f,opening_balance:Number(f.opening_balance)});setSaving(false);reload();close()}
  return <div className="modalBack"><div className="modal"><div className="modalHead"><div><h2>Add Supplier</h2><span>Supplier Master</span></div><button onClick={close}><X/></button></div>
  <form onSubmit={save}><div className="formGrid"><label>Supplier Name<input required value={f.supplier_name} onChange={e=>c('supplier_name',e.target.value)}/></label><label>Mobile<input value={f.mobile} onChange={e=>c('mobile',e.target.value)}/></label><label>GSTIN<input value={f.gstin} onChange={e=>c('gstin',e.target.value)}/></label><label>Opening Balance<input type="number" value={f.opening_balance} onChange={e=>c('opening_balance',e.target.value)}/></label><label style={{gridColumn:'1/-1'}}>Address<input value={f.address} onChange={e=>c('address',e.target.value)}/></label></div><div className="modalFoot"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving...':'Save Supplier'}</button></div></form></div></div>
}
function Purchase({products,suppliers,reload}) {
  const [show,setShow]=useState(false)
  return <div className="panel"><div className="panelHead"><h2>Purchase Management</h2><span className="count">Purchase → Stock +</span></div><div className="empty"><h3>No purchase invoices yet</h3><p>Create a purchase to automatically increase batch stock.</p><button className="primary" style={{margin:'10px auto'}} onClick={()=>setShow(true)}><Plus size={17}/> New Purchase</button></div>{show&&<PurchaseModal products={products} suppliers={suppliers} close={()=>setShow(false)} reload={reload}/>}</div>
}
function PurchaseModal({products,suppliers,close,reload}) {
  const [supplier,setSupplier]=useState(suppliers[0]?.id||''); const [date,setDate]=useState(new Date().toISOString().slice(0,10))
  const [rows,setRows]=useState([{product_id:products[0]?.id||'',batch_no:'',quantity:1,rate:products[0]?.purchase_rate||0,gst:0}])
  const [paid,setPaid]=useState(0),[discount,setDiscount]=useState(0),[transport,setTransport]=useState(0),[mode,setMode]=useState('Credit'),[saving,setSaving]=useState(false)
  const subtotal=rows.reduce((n,r)=>n+Number(r.quantity||0)*Number(r.rate||0),0), gst=rows.reduce((n,r)=>n+Number(r.quantity||0)*Number(r.rate||0)*Number(r.gst||0)/100,0), grand=Math.max(0,subtotal-Number(discount||0)+gst+Number(transport||0))
  const update=(i,k,v)=>setRows(a=>a.map((r,j)=>j===i?{...r,[k]:v}:r))
  const productChanged=(i,id)=>{const p=products.find(x=>x.id===id);setRows(a=>a.map((r,j)=>j===i?{...r,product_id:id,rate:p?.purchase_rate||0}:r))}
  async function save(e){e.preventDefault();if(!supabase||!supplier||!rows.length)return;setSaving(true);const no='PUR-'+Date.now()
    const {error}=await supabase.rpc('create_purchase',{p_purchase_no:no,p_supplier_id:supplier,p_purchase_date:date,p_discount:Number(discount||0),p_gst:Number(gst.toFixed(2)),p_transport:Number(transport||0),p_paid:Number(paid||0),p_payment_mode:mode,p_items:rows.map(r=>({...r,quantity:Number(r.quantity),rate:Number(r.rate),gst:Number(r.gst)}))})
    setSaving(false);if(error)alert(error.message);else{reload();close()}
  }
  return <div className="modalBack"><div className="modal wide"><div className="modalHead"><div><h2>New Purchase</h2><span>Stock increases automatically</span></div><button onClick={close}><X/></button></div>
  <form onSubmit={save}><div className="formGrid"><label>Supplier<select required value={supplier} onChange={e=>setSupplier(e.target.value)}>{suppliers.map(s=><option key={s.id} value={s.id}>{s.supplier_name}</option>)}</select></label><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
  <div className="purchaseRows">{rows.map((r,i)=><div className="purchaseRow" key={i}><select required value={r.product_id} onChange={e=>productChanged(i,e.target.value)}>{products.map(p=><option key={p.id} value={p.id}>{p.product_name} ({p.pack_size} {p.unit})</option>)}</select><input required placeholder="Batch No." value={r.batch_no} onChange={e=>update(i,'batch_no',e.target.value)}/><input type="number" min=".001" step=".001" value={r.quantity} onChange={e=>update(i,'quantity',e.target.value)}/><input type="number" min="0" step=".01" value={r.rate} onChange={e=>update(i,'rate',e.target.value)}/><input type="number" min="0" step=".01" placeholder="GST %" value={r.gst} onChange={e=>update(i,'gst',e.target.value)}/>{rows.length>1&&<button type="button" onClick={()=>setRows(a=>a.filter((_,j)=>j!==i))}><Trash2/></button>}</div>)}</div>
  <button type="button" className="secondary addrow" onClick={()=>setRows(a=>[...a,{product_id:products[0]?.id||'',batch_no:'',quantity:1,rate:products[0]?.purchase_rate||0,gst:0}])}><Plus size={15}/> Add Item</button>
  <div className="purchaseTotals"><label>Discount<input type="number" min="0" value={discount} onChange={e=>setDiscount(e.target.value)}/></label><label>Transport<input type="number" min="0" value={transport} onChange={e=>setTransport(e.target.value)}/></label><label>Paid<input type="number" min="0" value={paid} onChange={e=>setPaid(e.target.value)}/></label><label>Payment<select value={mode} onChange={e=>setMode(e.target.value)}><option>Credit</option><option>Cash</option><option>UPI</option><option>Bank</option></select></label><div className="totalBox">Grand Total <strong>₹{grand.toFixed(2)}</strong><small>Due: ₹{Math.max(0,grand-Number(paid||0)).toFixed(2)} · GST: ₹{gst.toFixed(2)}</small></div></div>
  <div className="modalFoot"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={saving||!suppliers.length||!products.length}>{saving?'Saving...':'Save Purchase'}</button></div></form></div></div>
}

function Customers({customers,reload}) {
  async function remove(id){if(!supabase||!confirm('Delete customer?'))return;await supabase.from('customers').delete().eq('id',id);reload()}
  return <div className="panel"><div className="panelHead"><h2>Customer Master</h2><span className="count">{customers.length} customers</span></div><div className="tableWrap"><table><thead><tr><th>Customer</th><th>Mobile</th><th>GSTIN</th><th>Opening Balance</th><th></th></tr></thead><tbody>
  {customers.length?customers.map(c=><tr key={c.id}><td><strong>{c.customer_name}</strong><small>{c.address||'—'}</small></td><td>{c.mobile||'—'}</td><td>{c.gstin||'—'}</td><td>₹{Number(c.opening_balance||0).toFixed(2)}</td><td className="rowActions"><button onClick={()=>remove(c.id)}><Trash2/></button></td></tr>):<tr><td colSpan="5" className="empty">No customers yet.</td></tr>}</tbody></table></div></div>
}
function CustomerModal({close,reload}) {
  const [f,setF]=useState({customer_name:'',mobile:'',address:'',gstin:'',opening_balance:0}),[saving,setSaving]=useState(false);const c=(k,v)=>setF(x=>({...x,[k]:v}))
  async function save(e){e.preventDefault();if(!supabase)return;setSaving(true);await supabase.from('customers').insert({...f,opening_balance:Number(f.opening_balance)});setSaving(false);reload();close()}
  return <div className="modalBack"><div className="modal"><div className="modalHead"><div><h2>Add Customer</h2><span>Customer Master</span></div><button onClick={close}><X/></button></div><form onSubmit={save}><div className="formGrid"><label>Customer Name<input required value={f.customer_name} onChange={e=>c('customer_name',e.target.value)}/></label><label>Mobile<input value={f.mobile} onChange={e=>c('mobile',e.target.value)}/></label><label>GSTIN<input value={f.gstin} onChange={e=>c('gstin',e.target.value)}/></label><label>Opening Balance<input type="number" min="0" step=".01" value={f.opening_balance} onChange={e=>c('opening_balance',e.target.value)}/></label><label style={{gridColumn:'1/-1'}}>Address<input value={f.address} onChange={e=>c('address',e.target.value)}/></label></div><div className="modalFoot"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving...':'Save Customer'}</button></div></form></div></div>
}
function Sales({products,customers,stock,reload}) {
  const [sales,setSales]=useState([])
  const [selected,setSelected]=useState(null)
  useEffect(()=>{ if(!supabase)return; supabase.from('sales').select('*, customers(customer_name,mobile,address,gstin), sale_items(*, products(product_name,pack_size,unit))').order('created_at',{ascending:false}).limit(50).then(({data})=>setSales(data||[])) },[])
  return <div>
    <div className="panel"><div className="panelHead"><h2>Sales & Billing</h2><span className="count">{sales.length} recent invoices</span></div>
      <div className="tableWrap"><table><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Subtotal</th><th>GST</th><th>Total</th><th>Paid</th><th>Due</th><th></th></tr></thead>
      <tbody>{sales.length?sales.map(x=><tr key={x.id}><td><strong>{x.invoice_no}</strong></td><td>{x.sale_date}</td><td>{x.customers?.customer_name||'Walk-in'}</td><td>₹{Number(x.subtotal||0).toFixed(2)}</td><td>₹{Number(x.gst||0).toFixed(2)}</td><td>₹{Number(x.grand_total||0).toFixed(2)}</td><td>₹{Number(x.paid||0).toFixed(2)}</td><td>₹{Number(x.due||0).toFixed(2)}</td><td><button className="secondary smallBtn" onClick={()=>setSelected(x)}>Print</button></td></tr>):<tr><td colSpan="9" className="empty">No sales invoices yet. Create a bill to begin.</td></tr>}</tbody></table></div>
    </div>
    {selected && <InvoicePrint sale={selected} close={()=>setSelected(null)}/>}
  </div>
}

function SaleModal({products,customers,stock,close,reload}) {
  const batchesFor=p=>stock.filter(s=>s.product_id===p)
  const firstProduct=products[0]?.id||''
  const [customer,setCustomer]=useState(customers[0]?.id||''),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[paid,setPaid]=useState(0),[discount,setDiscount]=useState(0),[mode,setMode]=useState('Cash'),[saving,setSaving]=useState(false)
  const [rows,setRows]=useState([{product_id:firstProduct,batch_no:stock.find(s=>s.product_id===firstProduct)?.batch_no||'',quantity:1,rate:products[0]?.selling_rate||0,gst:products[0]?.gst_percent||0}])
  const subtotal=rows.reduce((n,r)=>n+Number(r.quantity||0)*Number(r.rate||0),0),gst=rows.reduce((n,r)=>n+Number(r.quantity||0)*Number(r.rate||0)*Number(r.gst||0)/100,0),grand=Math.max(0,subtotal-Number(discount||0)+gst)
  const update=(i,k,v)=>setRows(a=>a.map((r,j)=>j===i?{...r,[k]:v}:r))
  const productChanged=(i,id)=>{const p=products.find(x=>x.id===id),b=stock.find(x=>x.product_id===id);setRows(a=>a.map((r,j)=>j===i?{...r,product_id:id,batch_no:b?.batch_no||'',rate:p?.selling_rate||0,gst:p?.gst_percent||0}:r))}
  async function save(e){e.preventDefault();if(!supabase||!customer)return;setSaving(true);const no='INV-'+Date.now();const {error}=await supabase.rpc('create_sale',{p_invoice_no:no,p_customer_id:customer,p_sale_date:date,p_discount:Number(discount||0),p_paid:Number(paid||0),p_payment_mode:mode,p_items:rows.map(r=>({...r,quantity:Number(r.quantity),rate:Number(r.rate),gst:Number(r.gst)}))});setSaving(false);if(error)alert(error.message);else{reload();close()}}
  return <div className="modalBack"><div className="modal wide"><div className="modalHead"><div><h2>New Sales Bill</h2><span>Stock decreases automatically</span></div><button onClick={close}><X/></button></div><form onSubmit={save}><div className="formGrid"><label>Customer<select required value={customer} onChange={e=>setCustomer(e.target.value)}>{customers.map(c=><option key={c.id} value={c.id}>{c.customer_name}</option>)}</select></label><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
  <div className="purchaseRows">{rows.map((r,i)=><div className="purchaseRow" key={i}><select required value={r.product_id} onChange={e=>productChanged(i,e.target.value)}>{products.map(p=><option key={p.id} value={p.id}>{p.product_name} ({p.pack_size} {p.unit})</option>)}</select><select required value={r.batch_no} onChange={e=>update(i,'batch_no',e.target.value)}>{batchesFor(r.product_id).map(b=><option key={b.id} value={b.batch_no}>{b.batch_no} — {b.quantity} available</option>)}</select><input type="number" min=".001" step=".001" value={r.quantity} onChange={e=>update(i,'quantity',e.target.value)}/><input type="number" min="0" step=".01" value={r.rate} onChange={e=>update(i,'rate',e.target.value)}/><input type="number" min="0" step=".01" value={r.gst} onChange={e=>update(i,'gst',e.target.value)}/>{rows.length>1&&<button type="button" onClick={()=>setRows(a=>a.filter((_,j)=>j!==i))}><Trash2/></button>}</div>)}</div>
  <button type="button" className="secondary addrow" onClick={()=>{const p=products[0];const b=stock.find(s=>s.product_id===p?.id);setRows(a=>[...a,{product_id:p?.id||'',batch_no:b?.batch_no||'',quantity:1,rate:p?.selling_rate||0,gst:p?.gst_percent||0}])}}><Plus size={15}/> Add Item</button>
  <div className="purchaseTotals"><label>Discount<input type="number" min="0" value={discount} onChange={e=>setDiscount(e.target.value)}/></label><label>Paid<input type="number" min="0" value={paid} onChange={e=>setPaid(e.target.value)}/></label><label>Payment<select value={mode} onChange={e=>setMode(e.target.value)}><option>Cash</option><option>UPI</option><option>Bank</option><option>Credit</option></select></label><div className="totalBox">Grand Total <strong>₹{grand.toFixed(2)}</strong><small>Due: ₹{Math.max(0,grand-Number(paid||0)).toFixed(2)} · GST: ₹{gst.toFixed(2)}</small></div></div>
  <div className="modalFoot"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={saving||!customers.length||!products.length||!stock.length}>{saving?'Saving...':'Save Bill'}</button></div></form></div></div>
}


function PaymentsView({payments,customers,suppliers}) {
  const name=(p)=>p.party_type==='customer'?customers.find(x=>x.id===p.party_id)?.customer_name:suppliers.find(x=>x.id===p.party_id)?.supplier_name
  const total=payments.reduce((n,p)=>n+Number(p.amount||0),0)
  return <div className="panel"><div className="panelHead"><h2>Payments & Receipts</h2><span className="count">Total ₹{total.toFixed(2)}</span></div><div className="tableWrap"><table><thead><tr><th>Date</th><th>Party</th><th>Type</th><th>Amount</th><th>Mode</th><th>Reference</th></tr></thead><tbody>{payments.length?payments.map(p=><tr key={p.id}><td>{p.payment_date}</td><td><strong>{name(p)||'Unknown'}</strong></td><td>{p.party_type}</td><td>₹{Number(p.amount).toFixed(2)}</td><td>{p.payment_mode}</td><td>{p.reference||'—'}</td></tr>):<tr><td colSpan="6" className="empty">No payments recorded.</td></tr>}</tbody></table></div></div>
}
function PaymentModal({customers,suppliers,close,reload}) {
  const [type,setType]=useState('customer'),[party,setParty]=useState(customers[0]?.id||''),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[amount,setAmount]=useState(''),[mode,setMode]=useState('Cash'),[reference,setReference]=useState(''),[note,setNote]=useState(''),[saving,setSaving]=useState(false)
  const list=type==='customer'?customers:suppliers
  function changeType(v){setType(v);setParty((v==='customer'?customers:suppliers)[0]?.id||'')}
  async function save(e){e.preventDefault();if(!supabase||!party||Number(amount)<=0)return;setSaving(true);const {error}=await supabase.rpc('record_payment',{p_party_type:type,p_party_id:party,p_payment_date:date,p_amount:Number(amount),p_payment_mode:mode,p_reference:reference,p_note:note});setSaving(false);if(error)alert(error.message);else{reload();close()}}
  return <div className="modalBack"><div className="modal"><div className="modalHead"><div><h2>Record Payment</h2><span>Customer receipt or supplier payment</span></div><button onClick={close}><X/></button></div><form onSubmit={save}><div className="formGrid"><label>Party Type<select value={type} onChange={e=>changeType(e.target.value)}><option value="customer">Customer Receipt</option><option value="supplier">Supplier Payment</option></select></label><label>Party<select required value={party} onChange={e=>setParty(e.target.value)}>{list.map(x=><option key={x.id} value={x.id}>{x.customer_name||x.supplier_name}</option>)}</select></label><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Amount<input required type="number" min=".01" step=".01" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Payment Mode<select value={mode} onChange={e=>setMode(e.target.value)}><option>Cash</option><option>UPI</option><option>Bank</option><option>Cheque</option></select></label><label>Reference<input value={reference} onChange={e=>setReference(e.target.value)} placeholder="UTR / cheque no."/></label><label style={{gridColumn:'1/-1'}}>Note<input value={note} onChange={e=>setNote(e.target.value)}/></label></div><div className="modalFoot"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={saving||!list.length}>{saving?'Saving...':'Save Payment'}</button></div></form></div></div>
}
function ExpensesView({expenses}) {
  const total=expenses.reduce((n,x)=>n+Number(x.amount||0),0)
  return <div className="panel"><div className="panelHead"><h2>Expenses</h2><span className="count">Total ₹{total.toFixed(2)}</span></div><div className="tableWrap"><table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Mode</th></tr></thead><tbody>{expenses.length?expenses.map(x=><tr key={x.id}><td>{x.expense_date}</td><td>{x.category}</td><td>{x.description||'—'}</td><td>₹{Number(x.amount).toFixed(2)}</td><td>{x.payment_mode}</td></tr>):<tr><td colSpan="5" className="empty">No expenses recorded.</td></tr>}</tbody></table></div></div>
}
function ExpenseModal({close,reload}) {
  const [f,setF]=useState({expense_date:new Date().toISOString().slice(0,10),category:'Transport',description:'',amount:'',payment_mode:'Cash'}),[saving,setSaving]=useState(false);const c=(k,v)=>setF(x=>({...x,[k]:v}))
  async function save(e){e.preventDefault();if(!supabase||Number(f.amount)<=0)return;setSaving(true);const {error}=await supabase.from('expenses').insert({...f,amount:Number(f.amount)});setSaving(false);if(error)alert(error.message);else{reload();close()}}
  return <div className="modalBack"><div className="modal"><div className="modalHead"><div><h2>Add Expense</h2><span>Business expense</span></div><button onClick={close}><X/></button></div><form onSubmit={save}><div className="formGrid"><label>Date<input type="date" value={f.expense_date} onChange={e=>c('expense_date',e.target.value)}/></label><label>Category<select value={f.category} onChange={e=>c('category',e.target.value)}>{['Transport','Labour','Electricity','Rent','Phone','Other'].map(x=><option key={x}>{x}</option>)}</select></label><label>Amount<input required type="number" min=".01" step=".01" value={f.amount} onChange={e=>c('amount',e.target.value)}/></label><label>Payment Mode<select value={f.payment_mode} onChange={e=>c('payment_mode',e.target.value)}><option>Cash</option><option>UPI</option><option>Bank</option></select></label><label style={{gridColumn:'1/-1'}}>Description<input value={f.description} onChange={e=>c('description',e.target.value)}/></label></div><div className="modalFoot"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving...':'Save Expense'}</button></div></form></div></div>
}


function ReportsView({products,stock,payments,expenses,suppliers,customers}) {
  const [tab,setTab]=useState('Stock')
  const [from,setFrom]=useState(''),[to,setTo]=useState('')
  const [sales,setSales]=useState([]),[purchases,setPurchases]=useState([])
  useEffect(()=>{ if(!supabase)return; Promise.all([
    supabase.from('sales').select('*').order('sale_date',{ascending:false}),
    supabase.from('purchases').select('*').order('purchase_date',{ascending:false})
  ]).then(([a,b])=>{setSales(a.data||[]);setPurchases(b.data||[])}) },[])
  const inRange=d=>(!from||d>=from)&&(!to||d<=to)
  const fs=sales.filter(x=>inRange(x.sale_date)), fp=purchases.filter(x=>inRange(x.purchase_date))
  const salesTotal=fs.reduce((n,x)=>n+Number(x.grand_total||0),0), purchaseTotal=fp.reduce((n,x)=>n+Number(x.grand_total||0),0)
  const expenseTotal=expenses.filter(x=>inRange(x.expense_date)).reduce((n,x)=>n+Number(x.amount||0),0)
  const gross=salesTotal-purchaseTotal, net=gross-expenseTotal
  return <div>
    <div className="reportTabs">{['Stock','Sales','Purchase','Profit & Loss','Customer Ledger','Supplier Ledger'].map(x=><button className={tab===x?'reportTab active':'reportTab'} key={x} onClick={()=>setTab(x)}>{x}</button>)}</div>
    <div className="panel reportFilter"><label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><button className="secondary" onClick={()=>{setFrom('');setTo('')}}>Clear</button></div>
    {tab==='Stock'&&<StockReport stock={stock}/>}
    {tab==='Sales'&&<TransactionReport title="Sales Report" rows={fs} dateKey="sale_date"/>}
    {tab==='Purchase'&&<TransactionReport title="Purchase Report" rows={fp} dateKey="purchase_date"/>}
    {tab==='Profit & Loss'&&<div className="cards reportCards"><div className="card"><span>Sales</span><strong>₹{salesTotal.toFixed(2)}</strong></div><div className="card"><span>Purchase</span><strong>₹{purchaseTotal.toFixed(2)}</strong></div><div className="card"><span>Expenses</span><strong>₹{expenseTotal.toFixed(2)}</strong></div><div className="card"><span>Net (simple)</span><strong>₹{net.toFixed(2)}</strong><small>Sales − Purchase − Expenses</small></div></div>}
    {tab==='Customer Ledger'&&<LedgerReport parties={customers} payments={payments} type="customer" sales={sales}/>}
    {tab==='Supplier Ledger'&&<LedgerReport parties={suppliers} payments={payments} type="supplier" purchases={purchases}/>}
  </div>
}
function StockReport({stock}) {
  return <div className="panel"><div className="panelHead"><h2>Current Stock Report</h2></div><div className="tableWrap"><table><thead><tr><th>Product</th><th>Batch</th><th>Pack</th><th>Qty</th><th>Expiry</th></tr></thead><tbody>{stock.length?stock.map(s=><tr key={s.id}><td>{s.products?.product_name}</td><td>{s.batch_no}</td><td>{s.products?.pack_size} {s.products?.unit}</td><td>{s.quantity}</td><td>{s.expiry_date||'—'}</td></tr>):<tr><td colSpan="5" className="empty">No stock records.</td></tr>}</tbody></table></div></div>
}
function TransactionReport({title,rows,dateKey}) {
  const total=rows.reduce((n,x)=>n+Number(x.grand_total||0),0), paid=rows.reduce((n,x)=>n+Number(x.paid||0),0), due=rows.reduce((n,x)=>n+Number(x.due||0),0)
  return <div className="panel"><div className="panelHead"><h2>{title}</h2><span className="count">₹{total.toFixed(2)} total</span></div><div className="tableWrap"><table><thead><tr><th>Date</th><th>Invoice</th><th>Total</th><th>Paid</th><th>Due</th><th>Mode</th></tr></thead><tbody>{rows.length?rows.map(x=><tr key={x.id}><td>{x[dateKey]}</td><td>{x.invoice_no||x.purchase_no}</td><td>₹{Number(x.grand_total).toFixed(2)}</td><td>₹{Number(x.paid).toFixed(2)}</td><td>₹{Number(x.due).toFixed(2)}</td><td>{x.payment_mode}</td></tr>):<tr><td colSpan="6" className="empty">No transactions for this period.</td></tr>}</tbody></table></div><div className="reportSummary">Total: ₹{total.toFixed(2)} · Paid: ₹{paid.toFixed(2)} · Due: ₹{due.toFixed(2)}</div></div>
}
function LedgerReport({parties,payments,type,sales,purchases}) {
  return <div className="panel"><div className="panelHead"><h2>{type==='customer'?'Customer':'Supplier'} Ledger</h2></div><div className="tableWrap"><table><thead><tr><th>Party</th><th>Opening</th><th>Transactions</th><th>Payments</th><th>Calculated Balance</th></tr></thead><tbody>{parties.length?parties.map(p=>{const tx=(type==='customer'?sales:purchases).filter(x=>(type==='customer'?x.customer_id:x.supplier_id)===p.id).reduce((n,x)=>n+Number(x.grand_total||0),0);const pay=payments.filter(x=>x.party_type===type&&x.party_id===p.id).reduce((n,x)=>n+Number(x.amount||0),0);const bal=Number(p.opening_balance||0)+tx-pay;return <tr key={p.id}><td><strong>{p.customer_name||p.supplier_name}</strong></td><td>₹{Number(p.opening_balance||0).toFixed(2)}</td><td>₹{tx.toFixed(2)}</td><td>₹{pay.toFixed(2)}</td><td>₹{bal.toFixed(2)}</td></tr>}):<tr><td colSpan="5" className="empty">No parties found.</td></tr>}</tbody></table></div></div>
}



function InvoicePrint({sale,close}) {
  function printNow(){ window.print() }
  const items=sale.sale_items||[]
  return <div className="modalBack printBack"><div className="invoice modal">
    <div className="invoiceToolbar noPrint"><button className="secondary" onClick={close}>Close</button><button className="primary" onClick={printNow}>Print Invoice</button></div>
    <div className="invoicePage" id="printInvoice">
      <div className="invoiceTop"><div><h1>MY FERTILIZER STORE</h1><p>Fertilizer & Agri Input Dealer</p><p>Address / Mobile / Email</p><p>GSTIN: __________________</p></div><div className="invoiceMeta"><strong>TAX INVOICE</strong><span>Invoice: {sale.invoice_no}</span><span>Date: {sale.sale_date}</span></div></div>
      <div className="billTo"><strong>Bill To</strong><span>{sale.customers?.customer_name||'Walk-in Customer'}</span><span>{sale.customers?.mobile||''}</span><span>{sale.customers?.address||''}</span><span>GSTIN: {sale.customers?.gstin||'—'}</span></div>
      <table><thead><tr><th>#</th><th>Product</th><th>Batch</th><th>Qty</th><th>Rate</th><th>GST %</th><th>Amount</th></tr></thead><tbody>{items.map((i,n)=><tr key={i.id}><td>{n+1}</td><td>{i.products?.product_name||i.product_id}<small>{i.products?.pack_size} {i.products?.unit}</small></td><td>{i.batch_no}</td><td>{i.quantity}</td><td>₹{Number(i.rate).toFixed(2)}</td><td>{i.gst}%</td><td>₹{Number(i.amount).toFixed(2)}</td></tr>)}</tbody></table>
      <div className="invoiceBottom"><div className="terms"><strong>Terms & Notes</strong><p>Goods once sold are subject to return policy. Please verify quantity and batch.</p></div><div className="invoiceTotals"><span>Subtotal <b>₹{Number(sale.subtotal||0).toFixed(2)}</b></span><span>Discount <b>₹{Number(sale.discount||0).toFixed(2)}</b></span><span>GST <b>₹{Number(sale.gst||0).toFixed(2)}</b></span><strong>Grand Total <b>₹{Number(sale.grand_total||0).toFixed(2)}</b></strong><span>Paid <b>₹{Number(sale.paid||0).toFixed(2)}</b></span><span>Due <b>₹{Number(sale.due||0).toFixed(2)}</b></span></div></div>
      <div className="signature">Authorized Signature</div>
    </div>
  </div></div>
}

function Returns({products,customers,suppliers,stock,reload}) {
  const [tab,setTab]=useState('Sales Return')
  return <div>
    <div className="reportTabs"><button className={tab==='Sales Return'?'reportTab active':'reportTab'} onClick={()=>setTab('Sales Return')}>Sales Return</button><button className={tab==='Purchase Return'?'reportTab active':'reportTab'} onClick={()=>setTab('Purchase Return')}>Purchase Return</button></div>
    {tab==='Sales Return'?<SalesReturn products={products} customers={customers} stock={stock} reload={reload}/>:<PurchaseReturn products={products} suppliers={suppliers} stock={stock} reload={reload}/>}
  </div>
}

function SalesReturn({products,customers,stock,reload}) {
  const [customer,setCustomer]=useState(customers[0]?.id||''),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[saving,setSaving]=useState(false)
  const [rows,setRows]=useState([{product_id:products[0]?.id||'',batch_no:stock.find(s=>s.product_id===products[0]?.id)?.batch_no||'',quantity:1,rate:products[0]?.selling_rate||0,gst:products[0]?.gst_percent||0}])
  const update=(i,k,v)=>setRows(a=>a.map((r,j)=>j===i?{...r,[k]:v}:r))
  const changeProduct=(i,id)=>{const p=products.find(x=>x.id===id),b=stock.find(x=>x.product_id===id);setRows(a=>a.map((r,j)=>j===i?{...r,product_id:id,batch_no:b?.batch_no||'',rate:p?.selling_rate||0,gst:p?.gst_percent||0}:r))}
  const total=rows.reduce((n,r)=>n+Number(r.quantity||0)*Number(r.rate||0)*(1+Number(r.gst||0)/100),0)
  async function save(e){e.preventDefault();if(!supabase||!customer)return;setSaving(true);const {error}=await supabase.rpc('create_sales_return',{p_return_no:'SR-'+Date.now(),p_sale_id:null,p_customer_id:customer,p_return_date:date,p_refund_amount:Number(total.toFixed(2)),p_payment_mode:'Credit',p_note:'Sales return',p_items:rows});setSaving(false);if(error)alert(error.message);else{alert('Sales return saved. Stock increased.');reload()}}
  return <div className="panel"><div className="panelHead"><h2>Sales Return</h2><span className="count">Returned goods → Stock +</span></div><form onSubmit={save}><div className="formGrid"><label>Customer<select required value={customer} onChange={e=>setCustomer(e.target.value)}>{customers.map(c=><option key={c.id} value={c.id}>{c.customer_name}</option>)}</select></label><label>Return Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
    <div className="purchaseRows">{rows.map((r,i)=><div className="purchaseRow" key={i}><select required value={r.product_id} onChange={e=>changeProduct(i,e.target.value)}>{products.map(p=><option key={p.id} value={p.id}>{p.product_name} ({p.pack_size} {p.unit})</option>)}</select><select required value={r.batch_no} onChange={e=>update(i,'batch_no',e.target.value)}>{stock.filter(b=>b.product_id===r.product_id).map(b=><option key={b.id}>{b.batch_no}</option>)}</select><input type="number" min=".001" step=".001" value={r.quantity} onChange={e=>update(i,'quantity',e.target.value)}/><input type="number" min="0" step=".01" value={r.rate} onChange={e=>update(i,'rate',e.target.value)}/><input type="number" min="0" step=".01" value={r.gst} onChange={e=>update(i,'gst',e.target.value)}/>{rows.length>1&&<button type="button" onClick={()=>setRows(a=>a.filter((_,j)=>j!==i))}><Trash2/></button>}</div>)}</div>
    <button type="button" className="secondary addrow" onClick={()=>{const p=products[0],b=stock.find(x=>x.product_id===p?.id);setRows(a=>[...a,{product_id:p?.id||'',batch_no:b?.batch_no||'',quantity:1,rate:p?.selling_rate||0,gst:p?.gst_percent||0}])}}><Plus size={15}/> Add Item</button>
    <div className="returnTotal">Return Value: <strong>₹{total.toFixed(2)}</strong></div><div className="modalFoot"><button className="primary" disabled={saving||!customers.length||!products.length}>{saving?'Saving...':'Save Sales Return'}</button></div></form></div>
}

function PurchaseReturn({products,suppliers,stock,reload}) {
  const [supplier,setSupplier]=useState(suppliers[0]?.id||''),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[saving,setSaving]=useState(false)
  const [rows,setRows]=useState([{product_id:products[0]?.id||'',batch_no:stock.find(s=>s.product_id===products[0]?.id)?.batch_no||'',quantity:1,rate:products[0]?.purchase_rate||0,gst:products[0]?.gst_percent||0}])
  const update=(i,k,v)=>setRows(a=>a.map((r,j)=>j===i?{...r,[k]:v}:r))
  const changeProduct=(i,id)=>{const p=products.find(x=>x.id===id),b=stock.find(x=>x.product_id===id);setRows(a=>a.map((r,j)=>j===i?{...r,product_id:id,batch_no:b?.batch_no||'',rate:p?.purchase_rate||0,gst:p?.gst_percent||0}:r))}
  const total=rows.reduce((n,r)=>n+Number(r.quantity||0)*Number(r.rate||0)*(1+Number(r.gst||0)/100),0)
  async function save(e){e.preventDefault();if(!supabase||!supplier)return;setSaving(true);const {error}=await supabase.rpc('create_purchase_return',{p_return_no:'PR-'+Date.now(),p_purchase_id:null,p_supplier_id:supplier,p_return_date:date,p_received_amount:Number(total.toFixed(2)),p_payment_mode:'Credit',p_note:'Purchase return',p_items:rows});setSaving(false);if(error)alert(error.message);else{alert('Purchase return saved. Stock decreased.');reload()}}
  return <div className="panel"><div className="panelHead"><h2>Purchase Return</h2><span className="count">Returned goods → Stock −</span></div><form onSubmit={save}><div className="formGrid"><label>Supplier<select required value={supplier} onChange={e=>setSupplier(e.target.value)}>{suppliers.map(x=><option key={x.id}>{x.supplier_name}</option>)}</select></label><label>Return Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
    <div className="purchaseRows">{rows.map((r,i)=><div className="purchaseRow" key={i}><select required value={r.product_id} onChange={e=>changeProduct(i,e.target.value)}>{products.map(p=><option key={p.id} value={p.id}>{p.product_name} ({p.pack_size} {p.unit})</option>)}</select><select required value={r.batch_no} onChange={e=>update(i,'batch_no',e.target.value)}>{stock.filter(b=>b.product_id===r.product_id).map(b=><option key={b.id}>{b.batch_no}</option>)}</select><input type="number" min=".001" step=".001" value={r.quantity} onChange={e=>update(i,'quantity',e.target.value)}/><input type="number" min="0" step=".01" value={r.rate} onChange={e=>update(i,'rate',e.target.value)}/><input type="number" min="0" step=".01" value={r.gst} onChange={e=>update(i,'gst',e.target.value)}/>{rows.length>1&&<button type="button" onClick={()=>setRows(a=>a.filter((_,j)=>j!==i))}><Trash2/></button>}</div>)}</div>
    <button type="button" className="secondary addrow" onClick={()=>{const p=products[0],b=stock.find(x=>x.product_id===p?.id);setRows(a=>[...a,{product_id:p?.id||'',batch_no:b?.batch_no||'',quantity:1,rate:p?.purchase_rate||0,gst:p?.gst_percent||0}])}}><Plus size={15}/> Add Item</button>
    <div className="returnTotal">Return Value: <strong>₹{total.toFixed(2)}</strong></div><div className="modalFoot"><button className="primary" disabled={saving||!suppliers.length||!products.length}>{saving?'Saving...':'Save Purchase Return'}</button></div></form></div>
}


function StockAdjustmentModal({stock,close,reload}) {
  const [row,setRow]=useState({stock_id:stock[0]?.id||'',change:0,note:''}),[saving,setSaving]=useState(false)
  const selected=stock.find(x=>x.id===row.stock_id)
  async function save(e){e.preventDefault();if(!supabase||!selected||Number(row.change)===0)return;setSaving(true)
    const {error}=await supabase.rpc('adjust_stock',{p_product_id:selected.product_id,p_batch_no:selected.batch_no,p_quantity_change:Number(row.change),p_note:row.note||'Manual stock adjustment'})
    setSaving(false);if(error)alert(error.message);else{alert('Stock adjusted successfully.');close();reload()}
  }
  return <div className="modalBack"><div className="modal"><div className="modalHead"><div><h2>Stock Adjustment</h2><span>Use + to add and − to reduce physical stock</span></div><button onClick={close}><X/></button></div>
    <form onSubmit={save}><div className="formGrid"><label>Product / Batch<select value={row.stock_id} onChange={e=>setRow({...row,stock_id:e.target.value})}>{stock.map(x=><option key={x.id} value={x.id}>{x.products?.product_name} · {x.batch_no} · Current {x.quantity}</option>)}</select></label>
    <label>Quantity Change<input required type="number" step=".001" value={row.change} onChange={e=>setRow({...row,change:e.target.value})}/></label>
    <label className="full">Reason / Note<input value={row.note} onChange={e=>setRow({...row,note:e.target.value})} placeholder="Damage, physical count, opening correction..."/></label></div>
    <div className="modalFoot"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving...':'Apply Adjustment'}</button></div></form>
  </div></div>
}

function SettingsView({products=[],stock=[],suppliers=[],customers=[],payments=[],expenses=[]}) {
  const [form,setForm]=useState({id:1,business_name:'My Fertilizer Store',address:'',mobile:'',email:'',gstin:'',state:'',invoice_prefix:'INV'})
  const [saving,setSaving]=useState(false)
  useEffect(()=>{if(!supabase)return;supabase.from('business_settings').select('*').eq('id',1).maybeSingle().then(({data})=>{if(data)setForm(data)})},[])
  const change=(k,v)=>setForm(f=>({...f,[k]:v}))
  async function save(e){e.preventDefault();if(!supabase)return;setSaving(true);const {error}=await supabase.from('business_settings').upsert({...form,id:1,updated_at:new Date().toISOString()});setSaving(false);if(error)alert(error.message);else alert('Business settings saved.')}
  return <div className="settingsGrid">
    <div className="panel"><div className="panelHead"><div><h2>Business Profile</h2><span>Details used for invoices and business identity</span></div></div>
      <form onSubmit={save}><div className="formGrid"><label>Business / Shop Name<input required value={form.business_name} onChange={e=>change('business_name',e.target.value)}/></label><label>Mobile<input value={form.mobile||''} onChange={e=>change('mobile',e.target.value)}/></label><label>Email<input type="email" value={form.email||''} onChange={e=>change('email',e.target.value)}/></label><label>GSTIN<input value={form.gstin||''} onChange={e=>change('gstin',e.target.value.toUpperCase())}/></label><label>State<input value={form.state||''} onChange={e=>change('state',e.target.value)}/></label><label>Invoice Prefix<input value={form.invoice_prefix||'INV'} onChange={e=>change('invoice_prefix',e.target.value.toUpperCase())}/></label><label className="full">Address<textarea rows="3" value={form.address||''} onChange={e=>change('address',e.target.value)}/></label></div><div className="modalFoot"><button className="primary" disabled={saving}>{saving?'Saving...':'Save Business Settings'}</button></div></form>
    </div>
    <div className="panel"><div className="panelHead"><div><h2>System & Backup</h2><span>Production controls</span></div><ExportBackup products={products} stock={stock} suppliers={suppliers} customers={customers} payments={payments} expenses={expenses}/></div><div className="statusList"><div><span>Database</span><b>Supabase Connected</b></div><div><span>Inventory</span><b>Purchase / Sales / Returns linked</b></div><div><span>Units</span><b>g · kg · ml · L</b></div><div><span>Billing</span><b>GST + Print Invoice</b></div><div><span>Stock Control</span><b>Manual Adjustment Enabled</b></div><div><span>Authentication</span><b>Supabase Auth</b></div><div><span>Backup</span><b>JSON Export</b></div></div></div>
  </div>
}

function Module({name}){return <div className="panel module"><div className="moduleIcon"><Package size={25}/></div><h2>{name}</h2><p>This module is reserved for the interconnected transaction workflow. Purchase and Sales will update Inventory, Ledgers and Reports automatically.</p><div className="coming">Next development stage</div></div>}

