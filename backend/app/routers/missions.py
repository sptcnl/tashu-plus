from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Mission, User
from ..schemas import MissionActionOut, MissionOut
from ..seed import DEMO_USER_ID

router = APIRouter(prefix="/missions", tags=["missions"])


def _to_out(mission: Mission) -> MissionOut:
    return MissionOut(
        id=mission.id,
        from_station_id=mission.from_station_id,
        to_station_id=mission.to_station_id,
        from_station_name=mission.from_station.name,
        to_station_name=mission.to_station.name,
        distance_km=mission.distance_km,
        reward_points=mission.reward_points,
        status=mission.status,
    )


def _demo_user(db: Session) -> User:
    user = db.get(User, DEMO_USER_ID)
    if user is None:
        raise HTTPException(status_code=404, detail="데모 유저가 없습니다.")
    return user


@router.get("", response_model=list[MissionOut], summary="타슈 옮기기 미션 목록")
def list_missions(db: Session = Depends(get_db)):
    missions = db.scalars(select(Mission).order_by(Mission.id)).all()
    return [_to_out(m) for m in missions]


@router.post("/{mission_id}/accept", response_model=MissionActionOut, summary="미션 수락")
def accept_mission(mission_id: int, db: Session = Depends(get_db)):
    mission = db.get(Mission, mission_id)
    if mission is None:
        raise HTTPException(status_code=404, detail="미션을 찾을 수 없습니다.")
    if mission.status != "대기":
        raise HTTPException(status_code=409, detail=f"이미 '{mission.status}' 상태인 미션입니다.")

    mission.status = "진행중"
    db.commit()
    db.refresh(mission)
    user = _demo_user(db)
    return MissionActionOut(
        mission=_to_out(mission),
        user_points=user.points,
        message=f"미션을 수락했어요. 완료하면 {mission.reward_points}P 적립됩니다.",
    )


@router.post("/{mission_id}/complete", response_model=MissionActionOut, summary="미션 완료 (포인트 적립)")
def complete_mission(mission_id: int, db: Session = Depends(get_db)):
    mission = db.get(Mission, mission_id)
    if mission is None:
        raise HTTPException(status_code=404, detail="미션을 찾을 수 없습니다.")
    if mission.status != "진행중":
        raise HTTPException(status_code=409, detail="진행중인 미션만 완료할 수 있습니다.")

    mission.status = "완료"
    user = _demo_user(db)
    user.points += mission.reward_points
    db.commit()
    db.refresh(mission)
    db.refresh(user)
    return MissionActionOut(
        mission=_to_out(mission),
        user_points=user.points,
        message=f"미션 완료! {mission.reward_points}P 적립되었습니다.",
    )
