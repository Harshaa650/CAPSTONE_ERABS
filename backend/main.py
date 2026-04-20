"""ERABS - Enterprise Resource Allocation & Booking System (FastAPI backend)."""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from contextlib import asynccontextmanager

import hashlib, secrets
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import (create_engine, Column, Integer, String, DateTime, Boolean,
                        ForeignKey, Text, and_, or_)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session
from pydantic import BaseModel
import jwt  # PyJWT (pure python)
from dotenv import load_dotenv

load_dotenv()
# Use PostgreSQL
DATABASE_URL = "postgresql://erabs_user:securepassword@localhost/erabs"
SECRET_KEY = os.getenv("SECRET_KEY", "erabs-dev-secret-change-me")
ALGORITHM = "HS256"
TOKEN_EXP_MIN = 60 * 24

# No special connection args needed for PostgreSQL
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# --- Pure-python password hashing (PBKDF2-HMAC-SHA256, stdlib only) ---
class _Pwd:
    @staticmethod
    def hash(pw: str) -> str:
        salt = secrets.token_bytes(16)
        dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 200_000)
        return f"pbkdf2$200000${salt.hex()}${dk.hex()}"
    @staticmethod
    def verify(pw: str, stored: str) -> bool:
        try:
            _, iters, salt_hex, hash_hex = stored.split("$")
            dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt_hex), int(iters))
            return secrets.compare_digest(dk.hex(), hash_hex)
        except Exception:
            return False
pwd = _Pwd()

# -------- Models --------
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    hashed_password = Column(String)
    role = Column(String, default="employee")  # employee | manager | admin
    department = Column(String, default="General")
    bookings = relationship("Booking", back_populates="user", foreign_keys="Booking.user_id")

class Resource(Base):
    __tablename__ = "resources"
    id = Column(Integer, primary_key=True)
    name = Column(String, index=True)
    type = Column(String)  # room, desk, projector, vehicle
    description = Column(Text, default="")
    capacity = Column(Integer, default=1)
    location = Column(String, default="HQ")
    avail_start = Column(Integer, default=8)   # hour 0-23
    avail_end = Column(Integer, default=20)
    requires_approval = Column(Boolean, default=False)
    department_restricted = Column(String, default="")  # comma separated or empty
    max_duration_min = Column(Integer, default=240)
    active = Column(Boolean, default=True)
    image_url = Column(String, default="")

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    resource_id = Column(Integer, ForeignKey("resources.id"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    attendees = Column(Integer, default=1)
    purpose = Column(Text, default="")
    status = Column(String, default="pending")  # pending, approved, rejected, cancelled, completed
    approver_comment = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="bookings", foreign_keys=[user_id])
    resource = relationship("Resource")

class Maintenance(Base):
    __tablename__ = "maintenance"
    id = Column(Integer, primary_key=True)
    resource_id = Column(Integer, ForeignKey("resources.id"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    reason = Column(String, default="Scheduled maintenance")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    actor_id = Column(Integer)
    action = Column(String)
    entity = Column(String)
    entity_id = Column(Integer)
    details = Column(Text, default="")
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

# -------- Schemas --------
class Token(BaseModel):
    access_token: str; token_type: str = "bearer"; user: dict

class UserOut(BaseModel):
    id: int; email: str; name: str; role: str; department: str
    class Config: from_attributes = True

class UserCreate(BaseModel):
    email: str; name: str; password: str
    role: str = "employee"; department: str = "General"

class ResourceIn(BaseModel):
    name: str; type: str; description: str = ""; capacity: int = 1
    location: str = "HQ"; avail_start: int = 8; avail_end: int = 20
    requires_approval: bool = False; department_restricted: str = ""
    max_duration_min: int = 240; active: bool = True; image_url: str = ""

class ResourceOut(ResourceIn):
    id: int
    class Config: from_attributes = True

class BookingIn(BaseModel):
    resource_id: int; start_time: datetime; end_time: datetime
    attendees: int = 1; purpose: str = ""

class BookingOut(BaseModel):
    id: int; user_id: int; resource_id: int
    start_time: datetime; end_time: datetime
    attendees: int; purpose: str; status: str
    approver_comment: str; created_at: datetime
    user_name: Optional[str] = None; resource_name: Optional[str] = None
    class Config: from_attributes = True

class MaintenanceIn(BaseModel):
    resource_id: int; start_time: datetime; end_time: datetime; reason: str = ""

# -------- Helpers --------
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def create_token(uid: int):
    exp = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXP_MIN)
    return jwt.encode({"sub": str(uid), "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)

def current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    cred_err = HTTPException(401, "Invalid credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = int(payload.get("sub"))
    except (jwt.PyJWTError, TypeError, ValueError):
        raise cred_err
    u = db.query(User).get(uid)
    if not u: raise cred_err
    return u

def require_role(*roles):
    def dep(u: User = Depends(current_user)):
        if u.role not in roles:
            raise HTTPException(403, f"Requires role: {roles}")
        return u
    return dep

def audit(db: Session, actor_id: int, action: str, entity: str, entity_id: int, details: str = ""):
    db.add(AuditLog(actor_id=actor_id, action=action, entity=entity, entity_id=entity_id, details=details))

def serialize_booking(b: Booking) -> dict:
    return {
        "id": b.id, "user_id": b.user_id, "resource_id": b.resource_id,
        "start_time": b.start_time, "end_time": b.end_time,
        "attendees": b.attendees, "purpose": b.purpose, "status": b.status,
        "approver_comment": b.approver_comment, "created_at": b.created_at,
        "user_name": b.user.name if b.user else None,
        "resource_name": b.resource.name if b.resource else None,
    }

def detect_conflict(db: Session, resource_id: int, start: datetime, end: datetime,
                    attendees: int, exclude_id: Optional[int] = None) -> Optional[str]:
    res = db.query(Resource).get(resource_id)
    if not res or not res.active: return "Resource not available"
    if start >= end: return "End must be after start"
    if start.hour < res.avail_start or end.hour > res.avail_end:
        return f"Outside booking hours ({res.avail_start}:00 – {res.avail_end}:00)"
    dur = (end - start).total_seconds() / 60
    if dur > res.max_duration_min:
        return f"Exceeds max duration ({res.max_duration_min} min)"
    mq = db.query(Maintenance).filter(
        Maintenance.resource_id == resource_id,
        Maintenance.start_time < end, Maintenance.end_time > start).first()
    if mq: return f"Resource under maintenance: {mq.reason}"
    q = db.query(Booking).filter(
        Booking.resource_id == resource_id,
        Booking.status.in_(["pending", "approved"]),
        Booking.start_time < end, Booking.end_time > start)
    if exclude_id: q = q.filter(Booking.id != exclude_id)
    overlaps = q.all()
    if res.capacity > 1:
        used = sum(b.attendees for b in overlaps)
        if used + attendees > res.capacity:
            return f"Capacity exceeded ({used}/{res.capacity} used)"
    elif overlaps:
        return "Time slot already booked"
    return None

# -------- Lifespan / Seed --------
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    db = SessionLocal()
    if db.query(User).count() == 0:
        users = [
            User(email="admin@erabs.io", name="Ada Admin", role="admin",
                 department="IT", hashed_password=pwd.hash("admin123")),
            User(email="manager@erabs.io", name="Max Manager", role="manager",
                 department="Engineering", hashed_password=pwd.hash("manager123")),
            User(email="employee@erabs.io", name="Eve Employee", role="employee",
                 department="Engineering", hashed_password=pwd.hash("employee123")),
        ]
        db.add_all(users)
        resources = [
            Resource(name="Aurora Boardroom", type="room", capacity=12, location="Floor 4",
                     description="Executive boardroom with 4K display",
                     requires_approval=True, image_url="https://images.unsplash.com/photo-1497366216548-37526070297c?w=600"),
            Resource(name="Nebula Focus Pod", type="room", capacity=2, location="Floor 2",
                     description="Quiet 1-on-1 pod", image_url="https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600"),
            Resource(name="Quantum Lab", type="room", capacity=8, location="Floor 3",
                     description="Innovation lab with whiteboards", requires_approval=True,
                     image_url="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600"),
            Resource(name="4K Projector A", type="projector", capacity=1, location="Storage",
                     description="Portable 4K laser projector",
                     image_url="https://images.unsplash.com/photo-1626908013351-800ddd734b8a?w=600"),
            Resource(name="Hot Desk Cluster", type="desk", capacity=10, location="Floor 1",
                     description="Shared workspace cluster", image_url="https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600"),
            Resource(name="Fleet Car #3", type="vehicle", capacity=4, location="Garage",
                     description="Electric sedan", requires_approval=True,
                     image_url="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600"),
        ]
        db.add_all(resources); db.commit()
    db.close()
    yield

app = FastAPI(title="ERABS API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

# -------- Auth --------
@app.post("/api/auth/register", response_model=UserOut)
def register(u: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == u.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(email=u.email, name=u.name, role=u.role, department=u.department,
                hashed_password=pwd.hash(u.password))
    db.add(user); db.commit(); db.refresh(user)
    return user

@app.post("/api/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not pwd.verify(form.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password")
    return {"access_token": create_token(user.id), "token_type": "bearer",
            "user": {"id": user.id, "email": user.email, "name": user.name,
                     "role": user.role, "department": user.department}}

@app.get("/api/auth/me", response_model=UserOut)
def me(u: User = Depends(current_user)): return u

# -------- Resources --------
@app.get("/api/resources", response_model=List[ResourceOut])
def list_resources(db: Session = Depends(get_db)):
    return db.query(Resource).filter(Resource.active == True).all()

@app.post("/api/resources", response_model=ResourceOut)
def create_resource(r: ResourceIn, db: Session = Depends(get_db),
                    u: User = Depends(require_role("admin"))):
    res = Resource(**r.model_dump()); db.add(res)
    db.commit(); db.refresh(res)
    audit(db, u.id, "create", "resource", res.id, r.name); db.commit()
    return res

@app.put("/api/resources/{rid}", response_model=ResourceOut)
def update_resource(rid: int, r: ResourceIn, db: Session = Depends(get_db),
                    u: User = Depends(require_role("admin"))):
    res = db.query(Resource).get(rid)
    if not res: raise HTTPException(404, "Not found")
    for k, v in r.model_dump().items(): setattr(res, k, v)
    audit(db, u.id, "update", "resource", rid, r.name); db.commit(); db.refresh(res)
    return res

@app.delete("/api/resources/{rid}")
def delete_resource(rid: int, db: Session = Depends(get_db),
                    u: User = Depends(require_role("admin"))):
    res = db.query(Resource).get(rid)
    if not res: raise HTTPException(404, "Not found")
    res.active = False
    audit(db, u.id, "deactivate", "resource", rid); db.commit()
    return {"ok": True}

# -------- Bookings --------
@app.post("/api/bookings/validate")
def validate_booking(b: BookingIn, db: Session = Depends(get_db), u: User = Depends(current_user)):
    err = detect_conflict(db, b.resource_id, b.start_time, b.end_time, b.attendees)
    return {"ok": err is None, "reason": err}

@app.post("/api/bookings")
def create_booking(b: BookingIn, db: Session = Depends(get_db), u: User = Depends(current_user)):
    err = detect_conflict(db, b.resource_id, b.start_time, b.end_time, b.attendees)
    if err: raise HTTPException(400, err)
    res = db.query(Resource).get(b.resource_id)
    status_val = "pending" if res.requires_approval else "approved"
    bk = Booking(user_id=u.id, resource_id=b.resource_id, start_time=b.start_time,
                 end_time=b.end_time, attendees=b.attendees, purpose=b.purpose, status=status_val)
    db.add(bk); db.commit(); db.refresh(bk)
    audit(db, u.id, "create", "booking", bk.id, f"{res.name} {b.start_time}"); db.commit()
    return serialize_booking(bk)

@app.get("/api/bookings")
def list_bookings(scope: str = "mine", db: Session = Depends(get_db), u: User = Depends(current_user)):
    q = db.query(Booking)
    if scope == "mine": q = q.filter(Booking.user_id == u.id)
    elif scope == "pending":
        if u.role not in ("manager", "admin"): raise HTTPException(403, "Forbidden")
        q = q.filter(Booking.status == "pending")
    elif scope == "all":
        if u.role != "admin": raise HTTPException(403, "Forbidden")
    return [serialize_booking(b) for b in q.order_by(Booking.start_time.desc()).all()]

@app.post("/api/bookings/{bid}/approve")
def approve(bid: int, comment: str = "", db: Session = Depends(get_db),
            u: User = Depends(require_role("manager", "admin"))):
    bk = db.query(Booking).get(bid)
    if not bk: raise HTTPException(404, "Not found")
    if bk.status != "pending": raise HTTPException(400, "Not pending")
    bk.status = "approved"; bk.approver_comment = comment
    audit(db, u.id, "approve", "booking", bid, comment); db.commit()
    return serialize_booking(bk)

@app.post("/api/bookings/{bid}/reject")
def reject(bid: int, comment: str = "", db: Session = Depends(get_db),
           u: User = Depends(require_role("manager", "admin"))):
    bk = db.query(Booking).get(bid)
    if not bk: raise HTTPException(404, "Not found")
    if bk.status != "pending": raise HTTPException(400, "Not pending")
    bk.status = "rejected"; bk.approver_comment = comment
    audit(db, u.id, "reject", "booking", bid, comment); db.commit()
    return serialize_booking(bk)

@app.post("/api/bookings/{bid}/cancel")
def cancel(bid: int, db: Session = Depends(get_db), u: User = Depends(current_user)):
    bk = db.query(Booking).get(bid)
    if not bk: raise HTTPException(404, "Not found")
    if bk.user_id != u.id and u.role not in ("admin", "manager"):
        raise HTTPException(403, "Forbidden")
    if bk.status in ("cancelled", "rejected", "completed"):
        raise HTTPException(400, f"Cannot cancel ({bk.status})")
    bk.status = "cancelled"
    audit(db, u.id, "cancel", "booking", bid); db.commit()
    return serialize_booking(bk)

# -------- Maintenance --------
@app.get("/api/maintenance")
def list_maint(db: Session = Depends(get_db), _: User = Depends(current_user)):
    return [{"id": m.id, "resource_id": m.resource_id, "start_time": m.start_time,
             "end_time": m.end_time, "reason": m.reason} for m in db.query(Maintenance).all()]

@app.post("/api/maintenance")
def create_maint(m: MaintenanceIn, db: Session = Depends(get_db),
                 u: User = Depends(require_role("admin"))):
    mb = Maintenance(**m.model_dump()); db.add(mb); db.commit(); db.refresh(mb)
    # Cancel overlapping bookings
    overlaps = db.query(Booking).filter(
        Booking.resource_id == m.resource_id,
        Booking.status.in_(["pending", "approved"]),
        Booking.start_time < m.end_time, Booking.end_time > m.start_time).all()
    for b in overlaps:
        b.status = "cancelled"
        b.approver_comment = f"Auto-cancelled: maintenance ({m.reason})"
        audit(db, u.id, "auto-cancel", "booking", b.id, "maintenance overlap")
    audit(db, u.id, "create", "maintenance", mb.id, m.reason); db.commit()
    return {"id": mb.id, "cancelled": len(overlaps)}

@app.delete("/api/maintenance/{mid}")
def del_maint(mid: int, db: Session = Depends(get_db), u: User = Depends(require_role("admin"))):
    mb = db.query(Maintenance).get(mid)
    if not mb: raise HTTPException(404, "Not found")
    db.delete(mb); audit(db, u.id, "delete", "maintenance", mid); db.commit()
    return {"ok": True}

# -------- Analytics --------
@app.get("/api/analytics/summary")
def summary(db: Session = Depends(get_db), u: User = Depends(current_user)):
    total = db.query(Booking).count()
    pending = db.query(Booking).filter(Booking.status == "pending").count()
    active_res = db.query(Resource).filter(Resource.active == True).count()
    now = datetime.now(timezone.utc)
    upcoming = db.query(Booking).filter(
        Booking.status == "approved", Booking.start_time >= now).count()
    # Conflicts: count overlapping approved bookings on capacity-1 resources
    conflicts = 0
    by_dept = {}
    for b in db.query(Booking).filter(Booking.status.in_(["approved", "pending"])).all():
        dep = b.user.department if b.user else "Unknown"
        by_dept[dep] = by_dept.get(dep, 0) + 1
    by_type = {}
    for r in db.query(Resource).all():
        cnt = db.query(Booking).filter(Booking.resource_id == r.id,
                                       Booking.status == "approved").count()
        by_type[r.type] = by_type.get(r.type, 0) + cnt
    return {"total_bookings": total, "pending_approvals": pending,
            "active_resources": active_res, "upcoming": upcoming,
            "conflicts_detected": conflicts,
            "by_department": [{"name": k, "value": v} for k, v in by_dept.items()],
            "by_type": [{"name": k, "value": v} for k, v in by_type.items()]}

@app.get("/api/audit")
def audit_logs(db: Session = Depends(get_db), u: User = Depends(require_role("admin"))):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(200).all()
    return [{"id": l.id, "actor_id": l.actor_id, "action": l.action, "entity": l.entity,
             "entity_id": l.entity_id, "details": l.details, "timestamp": l.timestamp} for l in logs]

@app.get("/api/")
def root(): return {"name": "ERABS API", "status": "ok"}
