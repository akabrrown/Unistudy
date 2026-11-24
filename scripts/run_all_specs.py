"""
Master runner for UniStudy Specification Suite
Executes all 5 builders to generate professional DOCX specifications.
"""
import os
import sys

# Ensure scripts dir is on sys.path
sys.path.insert(0, os.path.dirname(__file__))

from build_prd import build_prd
from build_tdd import build_tdd
from build_design_brief import build_design_brief
from build_app_flow import build_app_flow
from build_backend_schema import build_backend_schema

def main():
    print("=" * 60)
    print("Generating UniStudy Official Specification Suite (.docx)")
    print("=" * 60)

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(project_root, "docs", "specifications")
    os.makedirs(out_dir, exist_ok=True)

    print("\n1/5 Building Product Requirements Document (PRD)...")
    build_prd()

    print("\n2/5 Building Technical Design Document (TDD)...")
    build_tdd()

    print("\n3/5 Building Design Brief & UI/UX Design System...")
    build_design_brief()

    print("\n4/5 Building Application Flow & User Journeys (App Flow)...")
    build_app_flow()

    print("\n5/5 Building Database Entity-Relationship & Backend Schema...")
    build_backend_schema()

    print("\n" + "=" * 60)
    print(f"All 5 DOCX specifications successfully generated in:\n{out_dir}")
    print("=" * 60)

if __name__ == "__main__":
    main()
