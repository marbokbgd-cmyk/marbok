import React, { useState } from "react";
import styles from "./Navigation.module.css";
import Link from "next/link";
import { useRouter } from "next/router";
import { IoMdArrowDropdown } from "react-icons/io";
import Dropdown from "@/components/Dropdown/Dropdown";
import { useAuth } from "@/hooks/useAuth";
import { useGetCurrentUser } from "@/hooks/useGetCurrentUser";
import { UserAvatar } from "../UserAvatar/UserAvatar";

function Navigation({ categories, isAdmin }) {
    const router = useRouter();
    const { authUser: user, signOutUser } = useAuth();
    const { data: userData } = useGetCurrentUser({ uid: user?.uid ?? null });

    const pathName = router.pathname;
    const [dropdown, setDropdown] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOutUser();
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <div className={styles.container}>
            <Link href={`/`} className={styles.listItem}>
                <p
                    className={`${styles.link} ${
                        pathName === "/" ? styles.activeLink : ""
                    }`}
                >
                    Naslovna
                </p>
            </Link>

            {isAdmin && <Link href="/products" className={styles.listItem}><p className={styles.link}>Proizvodi</p></Link>}
            {isAdmin && <Link href="/users" className={styles.listItem}><p className={styles.link}>Korisnici</p></Link>}
            {isAdmin && (
                <Link href="/orders" className={styles.listItem}>
                    <p
                        className={`${styles.link} ${
                            pathName === "/orders" ? styles.activeLink : ""
                        }`}
                    >
                        Porudžbine
                    </p>
                </Link>
            )}

            <span
                className={styles.listItem}
                onClick={() => setDropdown((prev) => !prev)}
            >
                <p
                    className={`${styles.link} ${
                        pathName === "/catalog" ? styles.activeLink : ""
                    }`}
                >
                    Katalog proizvoda
                </p>
                <IoMdArrowDropdown
                    className={`${styles.dropdownIcon} ${
                        dropdown && styles.arrowUp
                    }`}
                />
                {dropdown && (
                    <Dropdown
                        submenus={categories}
                        dropdown={dropdown}
                        className={styles.dropdown}
                    />
                )}
            </span>

            <Link href={`/aboutus`} className={styles.listItem}>
                <p
                    className={`${styles.link} ${
                        pathName === "/aboutus" ? styles.activeLink : ""
                    }`}
                >
                    O nama
                </p>
            </Link>
            <Link href={`/contact`} className={styles.listItem}>
                <p
                    className={`${styles.link} ${
                        pathName === "/contact" ? styles.activeLink : ""
                    }`}
                >
                    Kontakt
                </p>
            </Link>
            {user ? (
                <div className={styles.userSection}>
                    {userData?.name && <UserAvatar name={userData.name} />}
                    <button
                        onClick={handleSignOut}
                        className={styles.authButton}
                    >
                        Izloguj se
                    </button>
                </div>
            ) : (
                <Link href="/auth" className={styles.listItem}>
                    Prijavi se
                </Link>
            )}
        </div>
    );
}

export default Navigation;
